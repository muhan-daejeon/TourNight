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
    "Etiquette at Korean night festivals and crowded night events (fireworks, night markets, light festivals): crowd manners, queuing, walking on the right, keeping streets clean",
  transport:
    "Late-night transportation tips in Daejeon, Korea (subway/bus operating hours, taxis and Kakao T app, designated driver services)",
  safety:
    "Night safety guide for foreign tourists in Daejeon, Korea: emergency numbers 112/119, the 1330 Korea Travel Hotline with interpretation, safe areas at night",
  oncheon:
    "How to enjoy Yuseong hot springs area at night: the free public foot bath etiquette, jjimjilbang (Korean sauna) basics for foreigners",
  nature:
    "Etiquette for enjoying nature night spots in Daejeon (stargazing, night parks, lakeside trails): keeping quiet, flashlight manners, no littering, staying on paths, safety at night",
  streets:
    "Etiquette for enjoying Daejeon's downtown night streets and markets (Euneungjeongi culture street, Sky Road, night markets): walking in crowds, trying street food, taking photos of shops, noise late at night",
  parks:
    "Etiquette at Korean city parks and plazas at night (many are in residential areas): keeping noise down, cleaning up after picnics, respecting closing hours, bicycle/scooter paths, pets",
  views:
    "Etiquette and tips at night-view spots in Daejeon (observation towers, decks, bridges): photo courtesy without blocking others, tripod manners, keeping quiet, checking opening hours, staying safe near railings",
};

/** 서바이벌 한국어 상황 카테고리 (프롬프트 주입 방지 — 서버 정의만 허용) */
export const PHRASE_CATEGORIES: Record<string, string> = {
  food: "ordering food at Korean restaurants and street food stalls at night (ordering, recommendations, spiciness, takeout)",
  bar: "drinking at Korean bars and pojangmacha (ordering drinks, anju side dishes, toasting, asking for the bill)",
  taxi: "taking taxis and getting around at night (telling the destination, asking to stop, paying by card, how long it takes)",
  help: "asking for help or handling emergencies at night (I'm lost, please call the police, do you speak English, where is the hospital)",
  store: "using 24-hour convenience stores and shopping at night (how much is this, heating food, asking for a bag, paying by card)",
};

export interface Phrase {
  korean: string;
  roman: string;
  meaning: string;
}

/** 카테고리별 서바이벌 표현 6개 생성 */
export async function generatePhraseCategory(
  categoryId: string,
  locale: string,
): Promise<Phrase[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다");
  const situation = PHRASE_CATEGORIES[categoryId];
  if (!situation) throw new Error(`알 수 없는 카테고리: ${categoryId}`);

  const language = LOCALE_LANGUAGE[locale] ?? "English";
  const prompt = [
    `Create 6 essential Korean survival phrases for a foreign tourist in this situation:`,
    situation,
    `Return JSON array of {"korean": string, "roman": string (romanization), "meaning": string (translation in ${language})}.`,
    `Short, natural, polite (해요체). Respond with ONLY the JSON array.`,
  ].join("\n");

  const res = await fetch(`${BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API 오류: ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]",
  );
  if (!Array.isArray(parsed)) throw new Error("표현 목록 형식 오류");
  return parsed.slice(0, 6).map((p) => ({
    korean: String(p.korean ?? ""),
    roman: String(p.roman ?? ""),
    meaning: String(p.meaning ?? ""),
  }));
}

/** 자유 검색: 하고 싶은 말 → 한국어 번역 + 관련 표현 2개 */
export async function translatePhrase(
  query: string,
  locale: string,
): Promise<{ main: Phrase; related: Phrase[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다");

  const language = LOCALE_LANGUAGE[locale] ?? "English";
  const prompt = [
    `A foreign tourist in Korea wants to say something. Their request (any language): "${query.slice(0, 80)}"`,
    `Give the natural polite Korean phrase for it, plus 2 closely related useful phrases for the same situation.`,
    `Return JSON: {"main": {"korean","roman","meaning"}, "related": [{"korean","roman","meaning"} x2]}.`,
    `"meaning" must be in ${language}. Short, natural, polite (해요체). Respond with ONLY the JSON.`,
  ].join("\n");

  const res = await fetch(`${BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API 오류: ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}",
  );
  const toPhrase = (p: Record<string, unknown>): Phrase => ({
    korean: String(p?.korean ?? ""),
    roman: String(p?.roman ?? ""),
    meaning: String(p?.meaning ?? ""),
  });
  return {
    main: toPhrase(parsed.main ?? {}),
    related: Array.isArray(parsed.related)
      ? parsed.related.slice(0, 2).map(toPhrase)
      : [],
  };
}

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

/** AI 코스 짜기: 기준 스팟을 반드시 거치는 야간 코스 설계 결과 */
export interface CoursePlan {
  title: string;
  summary: string;
  tip: string;
  /** 방문 순서대로. contentId는 반드시 후보 목록 안의 값 */
  stops: { contentId: string; note: string }[];
}

export interface CourseCandidate {
  contentId: string;
  title: string;
  category: string;
  addr: string;
  /** 기준 스팟으로부터의 직선거리(m) — 기준 스팟 자신은 0 */
  distanceM: number;
  /** 인근 정류장 막차 시간 HHMM (정류장 없거나 정보 없으면 null) */
  lastBus?: string | null;
}

/**
 * 지도에서 고른 스팟(anchor)을 반드시 포함하는 야간 코스를 Gemini가 설계한다.
 * 후보는 서버가 뽑은 인근 검증 스팟으로 한정하고(환각·주입 방지),
 * 호출부에서 반환된 contentId가 후보에 있는지 다시 검증한다.
 */
export async function generateCoursePlan(
  anchor: CourseCandidate,
  candidates: CourseCandidate[],
  locale: string,
): Promise<CoursePlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다");

  const language = LOCALE_LANGUAGE[locale] ?? "English";
  const busTime = (t?: string | null) =>
    t ? `last bus ${t.slice(0, 2)}:${t.slice(2)}` : "no bus stop within 500m";
  const list = [anchor, ...candidates]
    .map(
      (c) =>
        `- id=${c.contentId} | ${c.title} | category=${c.category} | ${c.addr} | ${c.distanceM}m from the anchor | ${busTime(c.lastBus)}`,
    )
    .join("\n");

  const prompt = [
    `You are a night tourism course planner for Daejeon, South Korea.`,
    `Design ONE night course (evening to late night) that MUST include this anchor place:`,
    `anchor id=${anchor.contentId} (${anchor.title})`,
    `Choose 2 or 3 more places from this candidate list ONLY (never invent ids or places):`,
    list,
    `Rules:`,
    `- Total 3 to 4 stops including the anchor.`,
    `- Order them so travel is efficient (prefer nearby places, avoid zig-zag) and the mood builds through the night.`,
    `- Mix categories when it makes sense (e.g. city view -> nature walk -> science spot).`,
    `- Buses in Daejeon stop running around 22:30. Use the last bus times above:`,
    `  visit places with an EARLIER last bus first, and places reachable on foot or`,
    `  with no bus stop LAST, so the visitor is not stranded.`,
    `- Write in ${language}. Do not mention ids in the text.`,
    `Return JSON: {"title": string, "summary": string, "tip": string,`,
    ` "stops": [{"contentId": string, "note": string}]}`,
    `- title: short course name (under 6 words).`,
    `- summary: 1-2 sentences on what makes this route worth doing at night.`,
    `- note: one short sentence per stop — why visit it at this point of the night.`,
    `- tip: one practical tip about getting back at night, referring to the actual`,
    `  last bus times above (or taxi if a stop has no bus stop).`,
    `Respond with ONLY the JSON.`,
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
    title: String(parsed.title ?? ""),
    summary: String(parsed.summary ?? ""),
    tip: String(parsed.tip ?? ""),
    stops: Array.isArray(parsed.stops)
      ? parsed.stops.slice(0, 4).map((s: Record<string, unknown>) => ({
          contentId: String(s?.contentId ?? ""),
          note: String(s?.note ?? ""),
        }))
      : [],
  };
}

export interface EtiquetteGuide {
  intro: string;
  dos: string[];
  donts: string[];
  phrases: Phrase[];
}

/** 구조화된 에티켓 가이드 생성 (Do/Don't + 상황 표현) */
export async function generateEtiquette(
  topicId: string,
  locale: string,
): Promise<EtiquetteGuide> {
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
    `Write in ${language}. Return JSON:`,
    `{"intro": string (1-2 sentence overview),`,
    ` "dos": string[] (exactly 4 short practical DO tips),`,
    ` "donts": string[] (exactly 2 short DON'T cautions),`,
    ` "phrases": [{"korean","roman","meaning"} x4] (useful Korean phrases for this situation, meaning in ${language})}`,
    `Keep each item under 20 words. Respond with ONLY the JSON.`,
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
  if (!res.ok) {
    throw new Error(`Gemini API 오류: ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini 응답이 비어 있습니다");
  }
  const parsed = JSON.parse(text);
  const toPhrase = (p: Record<string, unknown>): Phrase => ({
    korean: String(p?.korean ?? ""),
    roman: String(p?.roman ?? ""),
    meaning: String(p?.meaning ?? ""),
  });
  return {
    intro: String(parsed.intro ?? ""),
    dos: Array.isArray(parsed.dos) ? parsed.dos.map(String).slice(0, 4) : [],
    donts: Array.isArray(parsed.donts) ? parsed.donts.map(String).slice(0, 2) : [],
    phrases: Array.isArray(parsed.phrases)
      ? parsed.phrases.slice(0, 4).map(toPhrase)
      : [],
  };
}
