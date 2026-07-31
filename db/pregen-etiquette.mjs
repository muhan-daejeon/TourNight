// 에티켓 가이드 사전생성: 4개 주제 × 4개 언어 = 16조합을 Gemini로 생성해 DB에 캐싱
// 사용법: npm run etiquette:pregen  (프롬프트나 주제 수정 시 재실행하면 덮어씀)
import postgres from "postgres";

const MODEL = "gemini-flash-latest";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const TOPICS = {
  pojangmacha:
    "How to order and enjoy food at a Korean pojangmacha (street food tent bar) at night",
  festival:
    "How to enjoy the Daejeon 0 O'Clock Festival (대전0시축제), a big summer night festival on Jungang-ro street in Daejeon",
  transport:
    "Late-night transportation tips in Daejeon, Korea (subway/bus operating hours, taxis, designated driver services)",
  dining:
    "Basic etiquette at Korean restaurants and bars at night (table manners, drinking culture, paying the bill)",
};

const LOCALES = { ko: "Korean", en: "English", ja: "Japanese", zh: "Simplified Chinese" };

async function generate(topic, language) {
  const prompt = [
    `You are a friendly local culture guide for foreign tourists enjoying nightlife in Daejeon, South Korea.`,
    `Topic: ${topic}`,
    `Write a practical guide in ${language}, under 250 words.`,
    `Structure: a one-sentence intro, then 3-5 practical tips as a bulleted list, then one "do not" caution.`,
    `Plain text with simple bullets only. No markdown headers.`,
  ].join("\n");

  const res = await fetch(
    `${BASE_URL}/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("빈 응답");
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
let ok = 0;
try {
  for (const [topicId, topic] of Object.entries(TOPICS)) {
    for (const [locale, language] of Object.entries(LOCALES)) {
      const content = await generateWithRetry(topic, language);
      await sleep(7000);
      await sql`
        insert into etiquette_cache (topic_id, locale, content)
        values (${topicId}, ${locale}, ${content})
        on conflict (topic_id, locale)
        do update set content = excluded.content, updated_at = now()
      `;
      ok += 1;
      console.log(`${topicId}/${locale} 저장 (${ok}/16)`);
    }
  }
} finally {
  await sql.end();
}
