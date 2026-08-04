/**
 * Gemini API 클라이언트 — 에티켓/문화 가이드 생성
 *
 * 모델: gemini-flash-latest (Gemini 3 Flash가 정식 출시되면 교체 예정)
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
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
  latefood:
    "Late-night eating in Daejeon, Korea: 24-hour gukbap restaurants, chicken & beer (chimaek) culture, and how food delivery works for foreigners",
  convenience:
    "How foreigners can make the most of Korean 24-hour convenience stores at night (heating meals, eating-in tables, buying transit cards)",
  dining:
    "Basic etiquette at Korean restaurants and bars at night (table manners, drinking culture with elders, paying the bill)",
  noraebang:
    "How to enjoy noraebang (Korean karaoke rooms) at night as a foreigner: renting a room, using the machine, singing etiquette",
  festival:
    "How to enjoy the Daejeon 0 O'Clock Festival (대전0시축제), a big summer night festival on Jungang-ro street in Daejeon",
  transport:
    "Late-night transportation tips in Daejeon, Korea (subway/bus operating hours, taxis and Kakao T app, designated driver services)",
  safety:
    "Night safety guide for foreign tourists in Daejeon, Korea: emergency numbers 112/119, the 1330 Korea Travel Hotline with interpretation, safe areas at night",
  oncheon:
    "How to enjoy Yuseong hot springs area at night: the free public foot bath etiquette, jjimjilbang (Korean sauna) basics for foreigners",
  nature:
    "Etiquette for enjoying nature night spots in Daejeon (stargazing, night parks, lakeside trails): keeping quiet, flashlight manners, no littering, staying on paths, safety at night",
};

/** 밤 상황 서바이벌 한국어 표현 생성 (비한국어 사용자용) */
export async function generatePhrases(
  locale: string,
): Promise<{ korean: string; roman: string; meaning: string }[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다");

  const language = LOCALE_LANGUAGE[locale] ?? "English";
  const prompt = [
    `Create 8 essential Korean survival phrases for a foreign tourist enjoying NIGHTLIFE in Daejeon, Korea`,
    `(street food tents, taxis, bars, asking for help at night).`,
    `Return JSON array of {"korean": string, "roman": string (romanization), "meaning": string (translation in ${language})}.`,
    `Keep phrases short, natural, and polite. Respond with ONLY the JSON array.`,
  ].join("\n");

  const res = await fetch(
    `${BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini API 오류: ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini 응답이 비어 있습니다");
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("표현 목록 형식 오류");
  return parsed.slice(0, 8).map((p) => ({
    korean: String(p.korean ?? ""),
    roman: String(p.roman ?? ""),
    meaning: String(p.meaning ?? ""),
  }));
}

/**
 * 스팟 현지화 가이드 생성: KTO 국문 개요를 사용자 언어로 요약 + 야간 방문 팁 3개
 * 원천데이터를 수정하지 않고 별도 생성 콘텐츠로 제공 (공모전 유의사항 대응)
 */
export async function generateSpotGuide(
  spot: { title: string; category: string; addr: string },
  overviewKo: string,
  locale: string,
): Promise<{ intro: string; tips: string[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다");

  const language = LOCALE_LANGUAGE[locale] ?? "English";
  const prompt = [
    `You are a night tourism guide for foreign visitors in Daejeon, South Korea.`,
    `Place: ${spot.title} (category: ${spot.category}, address: ${spot.addr})`,
    `Official Korean description (may be empty): ${overviewKo.slice(0, 1500)}`,
    `Write in ${language}. Return JSON: {"intro": string, "tips": string[]}`,
    `- intro: 2-3 sentence introduction of this place focused on visiting at night (base it on the official description when available; do not invent facts).`,
    `- tips: exactly 3 short practical tips for a foreign visitor at night (getting around, etiquette, what to see).`,
  ].join("\n");

  const res = await fetch(
    `${BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini API 오류: ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini 응답이 비어 있습니다");
  const parsed = JSON.parse(text);
  return {
    intro: String(parsed.intro ?? ""),
    tips: Array.isArray(parsed.tips) ? parsed.tips.map(String).slice(0, 3) : [],
  };
}

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
