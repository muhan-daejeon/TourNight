import type { NightSpot } from "@/lib/kto";

/**
 * 야간관광 여행성향 시뮬레이션 테스트.
 *
 * MBTI식 12문항(문항당 4지선다)에 답하면 7개 야간관광 성향 점수가 누적되고,
 * 최고점 성향을 주성향으로, 동점이면 부성향까지 함께 도출한다. 설계 근거와
 * 가중치는 기획 문서(여행성향 및 테스트 질문지 정리)를 그대로 옮긴 것으로,
 * 표시 문구는 언어별 messages(personality 네임스페이스)에 두고 여기서는 구조와
 * 점수만 다룬다.
 */
export const PERSONALITY_TYPES = [
  "explorer",
  "player",
  "socializer",
  "viewLover",
  "culturist",
  "foodie",
  "trendsetter",
] as const;

export type PersonalityType = (typeof PERSONALITY_TYPES)[number];

/** 문항당 선택지 식별자 (단일 선택) */
export const OPTION_KEYS = ["a", "b", "c", "d"] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];

/** 성향별 가감 점수. 문서의 소수점(예: +0.5) 가중치를 그대로 유지한다 */
type Weights = Partial<Record<PersonalityType, number>>;

export interface Question {
  id: string;
  /** 선택지 식별자 → 성향 가중치. 점수 변화가 없는 선택지는 빈 객체 */
  options: Record<OptionKey, Weights>;
}

/**
 * 12문항 가중치표. 각 선택지의 표시 문구는 messages의
 * personality.questions.<id>.<optionKey> 에서 읽는다.
 */
export const QUESTIONS: Question[] = [
  {
    id: "q1",
    options: {
      a: { explorer: 1 },
      b: { player: 1, socializer: 1 },
      c: { viewLover: 1 },
      d: { trendsetter: 1, viewLover: 0.5 },
    },
  },
  {
    id: "q2",
    options: {
      a: { explorer: 1 },
      b: { player: 1 },
      c: { foodie: 1 },
      d: { viewLover: 1, trendsetter: 0.5 },
    },
  },
  {
    id: "q3",
    options: {
      a: { socializer: 1, player: 0.5 },
      b: {}, // 정중히 거절 — 점수 변화 없음 (문서상 보정용)
      c: { explorer: 1, socializer: 0.5 },
      d: { trendsetter: 1 },
    },
  },
  {
    id: "q4",
    options: {
      a: { explorer: 1 },
      b: { culturist: 1 },
      c: { foodie: 1 },
      d: { player: 1, socializer: 1 },
    },
  },
  {
    id: "q5",
    options: {
      a: { explorer: 1 },
      b: { culturist: 1 },
      c: { foodie: 1 },
      d: { viewLover: 1 },
    },
  },
  {
    id: "q6",
    options: {
      a: { explorer: 0.5 }, // 기록은 하지만 중요도 낮음
      b: { viewLover: 1 },
      c: { foodie: 1 },
      d: { trendsetter: 1 },
    },
  },
  {
    id: "q7",
    options: {
      a: { explorer: 1 },
      b: { culturist: 1 },
      c: { viewLover: 1 },
      d: { foodie: 1 },
    },
  },
  {
    id: "q8",
    options: {
      a: { explorer: 1 },
      b: { viewLover: 1 },
      c: { foodie: 1 },
      d: { socializer: 1, trendsetter: 1 },
    },
  },
  {
    id: "q9",
    options: {
      a: { explorer: 1, socializer: 0.5 },
      b: { culturist: 1 },
      c: { foodie: 1 },
      d: { player: 1, socializer: 1 },
    },
  },
  {
    id: "q10",
    options: {
      a: { explorer: 1 },
      b: { viewLover: 1 },
      c: { foodie: 1 },
      d: { trendsetter: 1 },
    },
  },
  {
    id: "q11",
    options: {
      a: { explorer: 1 },
      b: { culturist: 1 },
      c: { socializer: 1, player: 0.5 },
      d: { foodie: 1 },
    },
  },
  {
    id: "q12",
    options: {
      a: { explorer: 1 },
      b: { culturist: 1 },
      c: { foodie: 1 },
      d: { socializer: 1 },
    },
  },
];

/**
 * 문항별 '밤 시간대' 배지. 대전역 도착(저녁)부터 새벽까지 밤이 흐르는 흐름을
 * 연출한다 (기획 목업의 PM 07:00 표기와 같은 취지). 표시는 24시간제 HH:MM.
 */
export const QUESTION_TIMES: string[] = [
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:30",
  "00:00",
  "00:30",
];

/**
 * 성향 → 야간명소 카테고리(science/nature/festival/city) 매핑.
 * 결과 화면에서 이 카테고리에 해당하는 코스를 추천한다. 카테고리가 4종뿐이라
 * 성향의 결이 가장 가까운 쪽으로 잇는다.
 */
export const TYPE_CATEGORIES: Record<PersonalityType, NightSpot["category"][]> = {
  explorer: ["city", "nature"], // 골목·로컬·비정형 루트
  player: ["festival", "city"], // 축제·야시장·이벤트
  socializer: ["festival", "city"], // 사람 사이·모임
  viewLover: ["nature", "city"], // 야경·강변·전망
  culturist: ["science", "city"], // 박물관·전시·스토리텔링
  foodie: ["city", "festival"], // 야시장·로컬 맛집
  trendsetter: ["nature", "festival"], // 포토·야경·핫플
};

export interface PersonalityResult {
  scores: Record<PersonalityType, number>;
  /** 최고점 성향(들). 동점이면 2개 이상 */
  primaryTypes: PersonalityType[];
  primary: PersonalityType;
  /** 공동 1위가 있으면 부성향 (없으면 null) */
  secondary: PersonalityType | null;
  maxScore: number;
}

/**
 * 답변(문항 id → 선택지 key)으로 성향 점수를 누적하고 결과를 도출한다.
 * 최고점이 여럿이면 앞의 두 성향을 주·부성향으로 삼는다 (문서 5-3 케이스 분기).
 */
export function scorePersonality(
  answers: Record<string, OptionKey>,
): PersonalityResult {
  const scores = Object.fromEntries(
    PERSONALITY_TYPES.map((t) => [t, 0]),
  ) as Record<PersonalityType, number>;

  for (const q of QUESTIONS) {
    const choice = answers[q.id];
    if (!choice) continue;
    const weights = q.options[choice];
    for (const [type, delta] of Object.entries(weights)) {
      scores[type as PersonalityType] += delta ?? 0;
    }
  }

  const maxScore = Math.max(...PERSONALITY_TYPES.map((t) => scores[t]));
  // PERSONALITY_TYPES 순서를 유지해 동점일 때 결과가 흔들리지 않게 한다
  const primaryTypes = PERSONALITY_TYPES.filter((t) => scores[t] === maxScore);

  return {
    scores,
    primaryTypes,
    primary: primaryTypes[0],
    secondary: primaryTypes.length > 1 ? primaryTypes[1] : null,
    maxScore,
  };
}

/** 모든 문항에 답했는지 */
export function isComplete(answers: Record<string, OptionKey>): boolean {
  return QUESTIONS.every((q) => !!answers[q.id]);
}

/**
 * 레이더 차트용 정규화 값(성향 순서대로 0~1). 최고점을 1로 두고 나머지를 비율로
 * 환산한다. 전부 0이면 모두 0을 반환한다.
 */
export function radarValues(
  scores: Record<PersonalityType, number>,
): { type: PersonalityType; value: number }[] {
  const max = Math.max(1, ...PERSONALITY_TYPES.map((t) => scores[t]));
  return PERSONALITY_TYPES.map((t) => ({ type: t, value: scores[t] / max }));
}
