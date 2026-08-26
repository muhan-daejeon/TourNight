// 자동 생성됨 — db/process-persona-images.mjs 로 persona/ 폴더에서 만들었다. 수동으로 고치지 말 것.

/** 성향 테스트 인트로 화면 우측에 쓰는 사진 (없으면 null) */
export const PERSONA_INTRO_IMAGE: string | null = "/persona/persona-0.jpg";

/** 문항 번호("1"~"6") → 선택지(a~d) → 사진 경로. 사진이 없는 문항은 키가 없다 */
export const PERSONA_QUESTION_IMAGES: Record<string, Partial<Record<"a" | "b" | "c" | "d", string>>> = {
  "1": {
    "a": "/persona/persona-q1-a.jpg",
    "b": "/persona/persona-q1-b.jpg",
    "c": "/persona/persona-q1-c.jpg",
    "d": "/persona/persona-q1-d.jpg"
  },
  "2": {
    "a": "/persona/persona-q2-a.jpg",
    "b": "/persona/persona-q2-b.jpg",
    "c": "/persona/persona-q2-c.jpg",
    "d": "/persona/persona-q2-d.jpg"
  },
  "3": {
    "a": "/persona/persona-q3-a.jpg",
    "b": "/persona/persona-q3-b.jpg",
    "c": "/persona/persona-q3-c.jpg",
    "d": "/persona/persona-q3-d.jpg"
  },
  "4": {
    "a": "/persona/persona-q4-a.jpg",
    "b": "/persona/persona-q4-b.jpg",
    "c": "/persona/persona-q4-c.jpg",
    "d": "/persona/persona-q4-d.jpg"
  },
  "5": {
    "a": "/persona/persona-q5-a.jpg",
    "b": "/persona/persona-q5-b.jpg",
    "c": "/persona/persona-q5-c.jpg",
    "d": "/persona/persona-q5-d.jpg"
  },
  "6": {
    "a": "/persona/persona-q6-a.jpg",
    "b": "/persona/persona-q6-b.jpg",
    "c": "/persona/persona-q6-c.jpg",
    "d": "/persona/persona-q6-d.jpg"
  }
};
