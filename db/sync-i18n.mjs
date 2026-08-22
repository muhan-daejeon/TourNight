// KTO 다국어 관광정보 서비스(영/일/중 GW)에서 공식 번역 수집
// 언어별 contentid가 달라 좌표(120m 이내 최근접)로 우리 스팟과 매칭한다.
// 사용법: npm run db:i18n   (검증된 스팟 대상, 재실행 시 갱신)
import postgres from "postgres";

const LANG_SERVICES = {
  en: "EngService2",
  ja: "JpnService2",
  zh: "ChsService2", // 중문 간체
};
const MATCH_RADIUS_M = 120;

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 앞 모델이 일일 한도(429)에 걸리면 다음 모델로 넘어간다 (한 번 걸리면 그날 계속 걸림)
const GEMINI_MODELS = [
  process.env.GEMINI_MODEL || "gemini-flash-latest",
  "gemini-flash-lite-latest",
];
let modelIndex = 0;
const LANG_NAME = { en: "English", ja: "Japanese", zh: "Simplified Chinese" };

/**
 * 공식 다국어 정보가 없는 스팟(공원·시장·광장 등 KTO 다국어 서비스 미등재)을
 * Gemini로 번역해 채운다. 공식 번역이 있으면 그것을 그대로 두므로 이 함수는
 * 빈 자리만 메운다.
 */
// 언어별 지명 표기 규칙 — 공식 다국어 데이터(KTO)의 표기 방식을 그대로 따른다.
// 일·중은 한자 표기 뒤에 한글 원문을 괄호로 병기한다: 大清湖（대청호）
const TITLE_RULE = {
  en: [
    `- title: use the official Revised Romanization of the Korean name plus the`,
    `  place type, e.g. "갑천" -> "Gapcheon Stream", "테미공원" -> "Temi Park".`,
  ],
  ja: [
    `- title: write the place name in Japanese kanji reading of the Korean name,`,
    `  then the original Korean in full-width parentheses, e.g.`,
    `  "대청호" -> "大清湖（대청호）", "유림공원" -> "裕林公園（유림공원）".`,
    `  If the name has no kanji origin (pure Korean word), use katakana instead,`,
    `  e.g. "으능정이문화의거리" -> "ウヌンジョンイ文化の通り（으능정이문화의거리）".`,
  ],
  zh: [
    `- title: write the place name in Simplified Chinese characters, then the`,
    `  original Korean in parentheses, e.g. "대청호" -> "大清湖(대청호)",`,
    `  "유림공원" -> "儒林公园(유림공원)". If the name has no Chinese-character`,
    `  origin, transliterate it, e.g. "스카이로드" -> "天空之路(스카이로드)".`,
  ],
};

// AI가 반복해서 틀리는 지명은 정답을 고정한다 (식장산의 한자는 食藏山)
const MANUAL_TITLE = {
  "식장산 전망대": {
    ja: "食藏山展望台（식장산 전망대）",
    zh: "食藏山展望台(식장산 전망대)",
  },
};

/**
 * 표기 다듬기 — 프롬프트만으로는 가끔 어긋나서 저장 전에 맞춘다.
 * 반각 가타카나(ﾄﾏ)를 전각으로 바꾸고, 빠진 한글 원문 병기를 채운다.
 */
function normalizeTitle(title, koTitle, locale) {
  const fixed = MANUAL_TITLE[koTitle]?.[locale];
  if (fixed) return fixed;
  if (locale !== "ja" && locale !== "zh") return title;
  // NFKC는 반각 가타카나를 전각으로 정규화한다 (전각 괄호는 아래에서 되돌림)
  let t = title.normalize("NFKC").trim();
  if (!t.includes(koTitle)) {
    t = `${t.replace(/\s*[（(].*?[）)]\s*$/, "")}(${koTitle})`;
  }
  if (locale === "ja") t = t.replace(/\((.+)\)\s*$/, "（$1）");
  return t;
}

/** Gemini에 JSON 하나를 받아 온다. 한도에 걸리면 다음 모델로 내려간다. */
async function geminiJson(prompt) {
  const call = (model) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 2048,
          },
        }),
      },
    );

  let res = await call(GEMINI_MODELS[modelIndex]);
  if (res.status === 429 && modelIndex + 1 < GEMINI_MODELS.length) {
    modelIndex += 1;
    console.log(`  한도 초과 — ${GEMINI_MODELS[modelIndex]}로 전환`);
    res = await call(GEMINI_MODELS[modelIndex]);
  }
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
}

async function translateSpot(title, overview, locale) {
  const language = LANG_NAME[locale] ?? "English";
  const prompt = [
    `Translate this Daejeon (South Korea) tourist place for a foreign visitor.`,
    `Korean name: ${title}`,
    overview ? `Korean description: ${overview.slice(0, 700)}` : "",
    `Return JSON: {"title": string, "overview": string}`,
    ...(TITLE_RULE[locale] ?? TITLE_RULE.en),
    `  Do not invent an unrelated name.`,
    ...(locale === "ja"
      ? [`  Use full-width katakana (トマ), never half-width (ﾄﾏ).`]
      : []),
    ...(locale === "ja" || locale === "zh"
      ? [
          `  Outside the parentheses the name must contain NO Hangul at all —`,
          `  convert every syllable (e.g. "유성" -> "儒城").`,
          `  Native Korean words have no hanja (한밭, 한빛, 빛, 큰, 울). If ANY part`,
          `  of the name is such a word, transliterate that part phonetically`,
          `  (${locale === "ja" ? "katakana: 한밭수목원 -> ハンバッ樹木園" : "chinese sounds: 한빛탑 -> 韩比塔"})`,
          `  instead of leaving it in Hangul or guessing an unrelated hanja.`,
        ]
      : []),
    `- overview: 2-3 sentences in ${language}. If no Korean description is given,`,
    `  write a short factual introduction based on the name only. No marketing hype.`,
    `Respond with ONLY the JSON.`,
  ]
    .filter(Boolean)
    .join("\n");

  const parsed = await geminiJson(prompt);
  const t = String(parsed.title ?? "").trim();
  if (!t) throw new Error("번역 제목이 비어 있음");
  return {
    title: normalizeTitle(t, title, locale),
    overview: String(parsed.overview ?? "").trim(),
  };
}

// 언어별 주소 표기 규칙 — 제목과 같은 원칙(현지 표기 + 원문 병기 없음)을 따른다.
// 주소는 이름과 달리 한글을 병기하지 않는다. 한 줄로 잘려 나오는 자리라 길면
// 뒤가 사라지고, 원문 한글은 상세 화면에 따로 그대로 보여준다.
const ADDR_RULE = {
  en: [
    `- Romanize with Revised Romanization and order it Western style:`,
    `  "대전광역시 서구 둔산로 100" -> "100 Dunsan-ro, Seo-gu, Daejeon".`,
    `  Keep road/district suffixes as -ro, -gil, -gu, -dong.`,
  ],
  ja: [
    `- Write it in Japanese with the Korean administrative units kept:`,
    `  "대전광역시 서구 둔산로 100" -> "大田広域市 西区 屯山路100".`,
    `  Pure Korean words with no kanji become katakana (도마동 -> トマ洞).`,
  ],
  zh: [
    `- Write it in Simplified Chinese with the Korean administrative units kept:`,
    `  "대전광역시 서구 둔산로 100" -> "大田广域市 西区 屯山路100".`,
    `  Pure Korean words with no hanja are transliterated by sound.`,
  ],
};

/** 주소 한 줄을 해당 언어 표기로 옮긴다 (번지·번호는 그대로 둔다) */
async function translateAddr(addr, locale) {
  const prompt = [
    `Convert this South Korean address for a foreign visitor.`,
    `Korean address: ${addr}`,
    `Return JSON: {"addr": string}`,
    ...(ADDR_RULE[locale] ?? ADDR_RULE.en),
    `- Keep every number exactly as given. Do not add, drop or reorder places.`,
    `- The result must contain NO Hangul at all.`,
    `- If the address ends with a parenthesised legal-dong like "(소제동)",`,
    `  convert it too and keep it in parentheses.`,
    `Respond with ONLY the JSON.`,
  ].join("\n");

  const out = await geminiJson(prompt);
  const a = String(out.addr ?? "").trim();
  if (!a) throw new Error("번역 주소가 비어 있음");
  // 한글이 남았으면 저장하지 않는다 — 반쯤 번역된 주소가 원문보다 나쁘다
  if (/[가-힣]/.test(a)) throw new Error(`한글이 남음: ${a}`);
  return a;
}

/**
 * 주소 번역 채우기.
 *
 * 제목·소개문과 달리 KTO 다국어 서비스에서 받아 둔 행에도 주소가 비어 있다
 * (그 시절엔 컬럼이 없었다). 그래서 제목 보완과 조건이 달라 패스를 따로 둔다.
 */
async function fillMissingAddrs() {
  if (!process.env.GEMINI_API_KEY) {
    console.log("GEMINI_API_KEY가 없어 주소 번역을 건너뜁니다");
    return;
  }
  const redo = process.argv.includes("--redo-addr");
  for (const locale of Object.keys(LANG_SERVICES)) {
    const missing = await sql`
      select s.content_id, s.title, s.addr
      from night_spots s
      join spot_translations tr
        on tr.content_id = s.content_id and tr.locale = ${locale}
      where s.night_verified = true and s.image_url is not null
        and nullif(trim(s.addr), '') is not null
        and (${redo} or nullif(trim(tr.addr), '') is null)
      order by s.title
    `;
    if (!missing.length) {
      console.log(`[${locale}] 주소 번역 대상 없음`);
      continue;
    }
    let done = 0;
    for (const s of missing) {
      try {
        const addr = await translateAddr(s.addr, locale);
        await sql`
          update spot_translations set addr = ${addr}, updated_at = now()
          where content_id = ${s.content_id} and locale = ${locale}
        `;
        done += 1;
      } catch (err) {
        console.warn(`  ${s.title} 주소 실패: ${err.message}`);
      }
      await sleep(4000); // 분당 호출 한도 회피
    }
    console.log(`[${locale}] 주소 번역: ${done}/${missing.length}건`);
  }
}

async function fillMissingWithAi() {
  if (!process.env.GEMINI_API_KEY) {
    console.log("GEMINI_API_KEY가 없어 보완 번역을 건너뜁니다");
    return;
  }
  // --redo: 이미 만든 AI 번역도 다시 생성 (표기 규칙을 바꿨을 때).
  // 공식 번역(lang_content_id 있음)은 어느 경우에도 건드리지 않는다.
  const redo = process.argv.includes("--redo");
  for (const locale of Object.keys(LANG_SERVICES)) {
    const missing = await sql`
      select s.content_id, s.title, ko.overview
      from night_spots s
      left join spot_translations tr
        on tr.content_id = s.content_id and tr.locale = ${locale}
      left join spot_translations ko
        on ko.content_id = s.content_id and ko.locale = 'ko'
      where s.night_verified = true and s.image_url is not null
        and (
          tr.title is null or tr.title = ''
          or ${redo} and tr.lang_content_id is null
          -- 한자 변환이 덜 된 AI 번역(괄호 앞에 한글이 남음)은 다시 만든다
          or (
            tr.lang_content_id is null and ${locale} in ('ja', 'zh')
            and regexp_replace(tr.title, '\s*[（(].*?[）)]\s*$', '') ~ '[가-힣]'
          )
        )
      order by s.title
    `;
    if (!missing.length) {
      console.log(`[${locale}] 보완 번역 대상 없음`);
      continue;
    }
    let done = 0;
    for (const s of missing) {
      try {
        const tr = await translateSpot(s.title, s.overview, locale);
        await sql`
          insert into spot_translations (content_id, locale, lang_content_id, title, overview)
          values (${s.content_id}, ${locale}, null, ${tr.title}, ${tr.overview})
          on conflict (content_id, locale) do update
            set title = excluded.title, overview = excluded.overview, updated_at = now()
        `;
        done += 1;
      } catch (err) {
        // 한 곳이 실패해도 나머지는 계속 채운다 (재실행하면 남은 것만 시도)
        console.warn(`  ${s.title} 실패: ${err.message}`);
      }
      await sleep(4000); // 분당 호출 한도 회피
    }
    console.log(`[${locale}] 보완 번역: ${done}/${missing.length}건`);
  }
}

function baseParams(extra) {
  return new URLSearchParams({
    serviceKey: process.env.KTO_API_KEY,
    MobileOS: "ETC",
    MobileApp: "TourNight",
    _type: "json",
    ...extra,
  });
}

async function fetchAll(service, extra) {
  const items = [];
  let page = 1;
  let total = Infinity;
  while (items.length < total) {
    const params = baseParams({
      numOfRows: "100",
      pageNo: String(page),
      arrange: "A",
      areaCode: "3",
      ...extra,
    });
    const res = await fetch(
      `https://apis.data.go.kr/B551011/${service}/areaBasedList2?${params}`,
    );
    if (!res.ok) throw new Error(`${service} ${res.status}`);
    const body = (await res.json())?.response?.body;
    total = body?.totalCount ?? 0;
    const chunk = body?.items?.item ?? [];
    if (chunk.length === 0) break;
    items.push(...chunk);
    page += 1;
    await sleep(120);
  }
  return items;
}

async function fetchOverview(service, contentId) {
  const params = baseParams({ contentId });
  const res = await fetch(
    `https://apis.data.go.kr/B551011/${service}/detailCommon2?${params}`,
  );
  if (!res.ok) return "";
  const data = await res.json();
  return data?.response?.body?.items?.item?.[0]?.overview ?? "";
}

// 대략적 미터 거리 (대전 위도 기준 근사)
function distM(lat1, lng1, lat2, lng2) {
  const dy = (lat1 - lat2) * 111_320;
  const dx = (lng1 - lng2) * 111_320 * Math.cos((36.35 * Math.PI) / 180);
  return Math.sqrt(dx * dx + dy * dy);
}

// --addr-only: 주소 번역만 채운다 (컬럼을 새로 만든 뒤 한 번 돌리는 용도)
if (process.argv.includes("--addr-only")) {
  try {
    await fillMissingAddrs();
  } finally {
    await sql.end();
  }
  process.exit(0);
}

// --ai-only: KTO 재수집 없이 빠진 번역만 채운다 (스팟을 새로 추가했을 때)
if (process.argv.includes("--ai-only")) {
  try {
    await fillMissingWithAi();
    await fillMissingAddrs();
  } finally {
    await sql.end();
  }
  process.exit(0);
}

try {
  // 매칭 대상: 검증된 실데이터 스팟 (mock 제외 — KTO에 없는 곳들)
  const spots = await sql`
    select content_id, title, st_x(geom) as x, st_y(geom) as y
    from night_spots
    where night_verified = true and content_id not like 'mock-%'
  `;
  console.log(`매칭 대상 스팟: ${spots.length}건`);

  // ko: 우리 contentid 그대로, 국문 공식 개요 저장
  let koSaved = 0;
  for (const s of spots) {
    const exists = await sql`
      select 1 from spot_translations where content_id = ${s.content_id} and locale = 'ko'
    `;
    if (exists.length) continue;
    const overview = await fetchOverview("KorService2", s.content_id);
    await sql`
      insert into spot_translations (content_id, locale, lang_content_id, title, overview)
      values (${s.content_id}, 'ko', ${s.content_id}, ${s.title}, ${overview})
      on conflict (content_id, locale) do update
        set overview = excluded.overview, updated_at = now()
    `;
    koSaved += 1;
    await sleep(120);
  }
  console.log(`ko 개요 저장: ${koSaved}건`);

  for (const [locale, service] of Object.entries(LANG_SERVICES)) {
    const langItems = (await fetchAll(service, {})).filter(
      (it) => it.mapx && Number(it.mapx) !== 0,
    );
    console.log(`[${locale}] ${service} 목록 ${langItems.length}건 수신`);

    let matched = 0;
    for (const s of spots) {
      // 최근접 항목 찾기
      let best = null;
      let bestD = Infinity;
      for (const it of langItems) {
        const d = distM(s.y, s.x, Number(it.mapy), Number(it.mapx));
        if (d < bestD) {
          bestD = d;
          best = it;
        }
      }
      if (!best || bestD > MATCH_RADIUS_M) continue;

      const exists = await sql`
        select 1 from spot_translations where content_id = ${s.content_id} and locale = ${locale}
      `;
      if (exists.length) {
        matched += 1;
        continue;
      }
      const overview = await fetchOverview(service, best.contentid);
      // 공식 주소가 있으면 그것을 쓴다 — AI 보완(fillMissingAddrs)보다 정확하다
      const addr = String(best.addr1 ?? "").trim() || null;
      await sql`
        insert into spot_translations (content_id, locale, lang_content_id, title, overview, addr)
        values (${s.content_id}, ${locale}, ${best.contentid}, ${best.title}, ${overview}, ${addr})
        on conflict (content_id, locale) do update
          set lang_content_id = excluded.lang_content_id,
              title = excluded.title, overview = excluded.overview,
              addr = coalesce(excluded.addr, spot_translations.addr), updated_at = now()
      `;
      matched += 1;
      await sleep(120);
    }
    console.log(`[${locale}] 매칭·저장: ${matched}/${spots.length}건`);
  }

  await fillMissingWithAi();
  await fillMissingAddrs();
} finally {
  await sql.end();
}
