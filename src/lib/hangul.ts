/** 한글 완성형 음절의 초성 19자 (유니코드 조합 순서 그대로) */
const CHOSUNG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

/** 사전순 정렬용 대표 초성 14자 — 이름 목록을 이 순서로 묶어 보여준다.
 * 된소리(ㄲㄸㅃㅆㅉ)로 시작하는 이름은 드물고, 있으면 바로 앞 예사소리
 * 칸에 함께 넣는다(ㄲ→ㄱ, ㄸ→ㄷ, …) — 인덱스를 14칸으로 짧게 유지한다 */
export const CHOSUNG_INDEX = [
  "ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

const DOUBLE_TO_BASE: Record<string, string> = {
  "ㄲ": "ㄱ",
  "ㄸ": "ㄷ",
  "ㅃ": "ㅂ",
  "ㅆ": "ㅅ",
  "ㅉ": "ㅈ",
};

/** 이 이름을 초성 인덱스의 어느 칸에 넣을지 — 한글이 아니면 null(기타로 취급) */
export function indexChar(name: string): string | null {
  const ch = name.trim().charAt(0);
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null; // 완성형 한글 음절 범위(가~힣) 밖
  const cho = CHOSUNG[Math.floor(code / (21 * 28))];
  return DOUBLE_TO_BASE[cho] ?? cho;
}
