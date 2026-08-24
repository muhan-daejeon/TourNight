// 공사에 다국어판이 없는 명소의 이름을 AI로 채운다.
// 사용법: npm run i18n:titles
//
// 화면에서도 뒤늦게 채우긴 하지만(src/lib/spots.ts), 그쪽은 응답을 붙잡지 않으려고
// 기다리지 않기 때문에 빌드가 먼저 끝나면 일부만 저장된다. 운영 전에 이걸 한 번
// 돌려 두면 첫 방문자부터 번역된 이름을 본다.
import postgres from "postgres";

const KTO = "https://apis.data.go.kr/B551011";
const SERVICE = { en: "EngService2", ja: "JpnService2", zh: "ChsService2" };
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const LANGUAGE = { en: "English", ja: "Japanese", zh: "Simplified Chinese" };
const STYLE = {
  en: 'Romanize the proper noun and translate the common noun. e.g. "뿌리공원" → "Ppuri Park".',
  ja: 'Use katakana/kanji, then the Korean original in full-width parentheses. e.g. "뿌리공원" → "プリ公園（뿌리공원）".',
  zh: 'Use simplified Chinese, then the Korean original in parentheses. e.g. "뿌리공원" → "根园（뿌리공원）".',
};

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = (s) => s.replace(/\s+/g, "").replace(/[()（）·]/g, "").toLowerCase();

async function list(service, contentTypes) {
  const out = new Map();
  for (const contentTypeId of contentTypes) {
    for (let pageNo = 1; pageNo <= 5; pageNo += 1) {
      const params = new URLSearchParams({
        serviceKey: process.env.KTO_API_KEY,
        MobileOS: "ETC",
        MobileApp: "TourNight",
        _type: "json",
        numOfRows: "100",
        pageNo: String(pageNo),
        areaCode: "3",
        contentTypeId,
      });
      const res = await fetch(`${KTO}/${service}/areaBasedList2?${params}`);
      if (!res.ok) throw new Error(`KTO ${service} ${res.status}`);
      const items = (await res.json())?.response?.body?.items?.item ?? [];
      items.forEach((i) => out.set(i.contentid, i.title));
      if (items.length < 100) break;
      await sleep(120);
    }
  }
  return out;
}

/** 다국어 제목의 괄호 안 한글 원문 */
function koreanIn(title) {
  const m = [...title.matchAll(/[（(]\s*([^（()）]*[가-힣][^（()）]*?)\s*[）)]/g)];
  return m.at(-1)?.[1]?.trim() || null;
}

async function translate(titles, locale) {
  const prompt = [
    `Translate these Korean tourist attraction names in Daejeon, Korea into ${LANGUAGE[locale]}.`,
    STYLE[locale],
    `Keep them short — these are labels on cards, not sentences.`,
    `Return JSON: {"<original Korean name>": "<translated name>"} for every input.`,
    `Names: ${JSON.stringify(titles)}`,
    `Respond with ONLY the JSON.`,
  ].join("\n");

  // 429(한도)면 잠깐 쉬었다 다시, 그래도 막히면 가벼운 모델로 넘어간다
  const models = [GEMINI_MODEL, "gemini-flash-lite-latest"];
  for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        return JSON.parse(
          data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}",
        );
      }
      if (res.status !== 429 && res.status < 500) {
        throw new Error(`Gemini ${res.status}`);
      }
      console.log(`  ${model} ${res.status} — ${attempt * 20}초 후 재시도`);
      await sleep(attempt * 20000);
    }
  }
  throw new Error("Gemini 한도로 번역하지 못했습니다 (잠시 후 다시 실행해 주세요)");
}

try {
  const verified = await sql`
    select content_id from night_spots
    where night_verified = true and content_id not like 'mock-%'
  `;
  const ids = new Set(verified.map((r) => r.content_id));
  const ko = await list("KorService2", ["12", "14", "15"]);
  console.log(`검수 통과 ${ids.size}곳 / 국문 목록 ${ko.size}건`);

  for (const [locale, service] of Object.entries(SERVICE)) {
    const translated = await list(service, ["76", "78", "85"]);
    const official = new Set(
      [...translated.values()].map((t) => koreanIn(t)).filter(Boolean).map(key),
    );

    // 공사 다국어판이 없고, 아직 우리 번역도 없는 곳
    const saved = await sql`
      select content_id from spot_translations where locale = ${locale}
    `;
    const has = new Set(saved.map((r) => r.content_id));

    const todo = [...ids]
      .filter((id) => ko.has(id) && !has.has(id))
      .filter((id) => !official.has(key(ko.get(id))))
      .map((id) => ({ id, title: ko.get(id) }));

    if (todo.length === 0) {
      console.log(`${locale}: 채울 이름 없음`);
      continue;
    }

    let saved2 = 0;
    for (let i = 0; i < todo.length; i += 20) {
      const chunk = todo.slice(i, i + 20);
      const result = await translate(chunk.map((t) => t.title), locale);
      for (const { id, title } of chunk) {
        const t = String(result[title] ?? "").trim();
        if (!t || t === title) continue;
        await sql`
          insert into spot_translations (content_id, locale, title, source)
          values (${id}, ${locale}, ${t}, 'ai')
          on conflict (content_id, locale) do update
            set title = excluded.title, source = 'ai', updated_at = now()
        `;
        saved2 += 1;
      }
      await sleep(1200);
    }
    console.log(`${locale}: ${saved2}/${todo.length}건 저장`);
  }
} finally {
  await sql.end();
}
