// 에티켓 가이드 사전생성: 4개 주제 × 4개 언어 = 16조합을 Gemini로 생성해 DB에 캐싱
// 사용법: npm run etiquette:pregen  (프롬프트나 주제 수정 시 재실행하면 덮어씀)
import postgres from "postgres";

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const TOPICS = {
  pojangmacha:
    "How to order and enjoy food at a Korean pojangmacha (street food tent bar) at night",
  latefood:
    "Late-night eating in Daejeon, Korea: 24-hour gukbap restaurants, chicken & beer (chimaek) culture, and how food delivery works for foreigners",
  convenience:
    "How foreigners can make the most of Korean 24-hour convenience stores at night (heating meals, eating-in tables, buying transit cards)",
  dining:
    "Basic etiquette at Korean restaurants and bars at night (table manners, drinking culture with elders, paying the bill)",
  noraebang:
    "How to enjoy noraebang (Korean karaoke rooms) at night as a foreigner: renting a room, using the machine, singing etiquette",
  festival:
    "Etiquette at Korean night festivals and crowded night events (fireworks, night markets, light festivals): crowd manners, queuing, walking on the right, keeping streets clean",
  transport:
    "Late-night transportation tips in Daejeon, Korea (subway/bus operating hours, taxis and Kakao T app, designated driver services)",
  safety:
    "Night safety guide for foreign tourists in Daejeon, Korea: emergency numbers 112/119, the 1330 Korea Travel Hotline with interpretation, safe areas at night",
  oncheon:
    "How to enjoy Yuseong hot springs area at night: the free public foot bath etiquette, jjimjilbang (Korean sauna) basics for foreigners",
  nature:
    "Etiquette for enjoying nature night spots in Daejeon (stargazing, night parks, lakeside trails): keeping quiet, flashlight manners, no littering, staying on paths, safety at night",
};

const LOCALES = { ko: "Korean", en: "English", ja: "Japanese", zh: "Simplified Chinese" };

async function generate(topic, language) {
  // 구조화 가이드(JSON): intro + Do 4 + Don't 2 + 상황 표현 2 — 앱 라우트와 동일 포맷
  const prompt = [
    `You are a friendly local culture guide for foreign tourists enjoying nightlife in Daejeon, South Korea.`,
    `Topic: ${topic}`,
    `Write in ${language}. Return JSON:`,
    `{"intro": string (1-2 sentence overview),`,
    ` "dos": string[] (exactly 4 short practical DO tips),`,
    ` "donts": string[] (exactly 2 short DON'T cautions),`,
    ` "phrases": [{"korean","roman","meaning"} x2] (useful Korean phrases, meaning in ${language})}`,
    `Keep each item under 20 words. Respond with ONLY the JSON.`,
  ].join("\n");

  const res = await fetch(
    `${BASE_URL}/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("빈 응답");
  JSON.parse(text); // 형식 검증
  return text;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 무료 티어 분당 호출 제한 대응: 429면 대기 후 재시도
async function generateWithRetry(topic, language) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await generate(topic, language);
    } catch (e) {
      if (!e.message.includes("429") || attempt >= 5) throw e;
      console.log(`  429 — ${attempt * 30}초 대기 후 재시도`);
      await sleep(attempt * 30_000);
    }
  }
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const force = process.argv.includes("--force"); // --force면 기존 것도 재생성
let ok = 0;
try {
  const existing = new Set(
    (await sql`select topic_id, locale from etiquette_cache`).map(
      (r) => `${r.topic_id}:${r.locale}`,
    ),
  );
  for (const [topicId, topic] of Object.entries(TOPICS)) {
    for (const [locale, language] of Object.entries(LOCALES)) {
      if (!force && existing.has(`${topicId}:${locale}`)) {
        ok += 1;
        continue;
      }
      const content = await generateWithRetry(topic, language);
      await sleep(7000);
      await sql`
        insert into etiquette_cache (topic_id, locale, content)
        values (${topicId}, ${locale}, ${content})
        on conflict (topic_id, locale)
        do update set content = excluded.content, updated_at = now()
      `;
      ok += 1;
      console.log(`${topicId}/${locale} 저장 (${ok}/${Object.keys(TOPICS).length * 4})`);
    }
  }

  // 서바이벌 한국어 표현 사전생성 (en/ja/zh)
  const phraseLocales = { en: "English", ja: "Japanese", zh: "Simplified Chinese" };
  const existingPhrases = new Set(
    (await sql`select locale from phrase_cache`).map((r) => r.locale),
  );
  for (const [locale, language] of Object.entries(phraseLocales)) {
    if (!force && existingPhrases.has(locale)) continue;
    const prompt = [
      `Create 8 essential Korean survival phrases for a foreign tourist enjoying NIGHTLIFE in Daejeon, Korea`,
      `(street food tents, taxis, bars, asking for help at night).`,
      `Return JSON array of {"korean": string, "roman": string (romanization), "meaning": string (translation in ${language})}.`,
      `Keep phrases short, natural, and polite. Respond with ONLY the JSON array.`,
    ].join("\n");
    for (let attempt = 1; ; attempt += 1) {
      try {
        const res = await fetch(
          `${BASE_URL}/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
          },
        );
        if (!res.ok) throw new Error(`Gemini ${res.status}`);
        const data = await res.json();
        const phrases = JSON.parse(
          data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]",
        );
        await sql`
          insert into phrase_cache (locale, phrases)
          values (${locale}, ${sql.json(phrases)})
          on conflict (locale) do update set phrases = excluded.phrases, updated_at = now()
        `;
        console.log(`phrases/${locale} 저장 (${phrases.length}개)`);
        break;
      } catch (e) {
        if (attempt >= 5) throw e;
        console.log(`  phrases/${locale} 오류(${e.message}) — ${attempt * 30}초 대기`);
        await sleep(attempt * 30_000);
      }
    }
    await sleep(7000);
  }
} finally {
  await sql.end();
}
