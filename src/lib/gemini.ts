/**
 * Gemini API 클라이언트 — 에티켓/문화 가이드 생성
 *
 * 모델: gemini-flash-latest (Gemini 3 Flash가 정식 출시되면 교체 예정)
 */

const MODEL = "gemini-flash-latest";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const LOCALE_LANGUAGE: Record<string, string> = {
  ko: "Korean",
  en: "English",
  ja: "Japanese",
  zh: "Simplified Chinese",
};

/** 프롬프트 주입 방지를 위해 주제는 서버에 정의된 것만 허용 */
export const ETIQUETTE_TOPICS: Record<string, string> = {
  pojangmacha:
    "How to order and enjoy food at a Korean pojangmacha (street food tent bar) at night",
  festival:
    "How to enjoy the Daejeon 0 O'Clock Festival (대전0시축제), a big summer night festival on Jungang-ro street in Daejeon",
  transport:
    "Late-night transportation tips in Daejeon, Korea (subway/bus operating hours, taxis, designated driver services)",
  dining:
    "Basic etiquette at Korean restaurants and bars at night (table manners, drinking culture, paying the bill)",
};

export async function generateEtiquette(
  topicId: string,
  locale: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다");
  }

  const topic = ETIQUETTE_TOPICS[topicId];
  if (!topic) {
    throw new Error(`알 수 없는 주제: ${topicId}`);
  }

  const language = LOCALE_LANGUAGE[locale] ?? "English";
  const prompt = [
    `You are a friendly local culture guide for foreign tourists enjoying nightlife in Daejeon, South Korea.`,
    `Topic: ${topic}`,
    `Write a practical guide in ${language}, under 250 words.`,
    `Structure: a one-sentence intro, then 3-5 practical tips as a bulleted list, then one "do not" caution.`,
    `Plain text with simple bullets only. No markdown headers.`,
  ].join("\n");

  const res = await fetch(
    `${BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini API 오류: ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini 응답이 비어 있습니다");
  }
  return text;
}
