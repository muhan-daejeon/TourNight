import type { Locale } from "@/i18n/routing";

/**
 * 아주 가벼운 문자 스크립트 기반 언어 판별.
 *
 * 커뮤니티 글이 지원하는 4개 언어(ko/en/ja/zh) 중 어느 것으로 쓰였는지 대략
 * 짐작해 "이 글, 지금 화면 언어로 (번역)" 버튼을 보일지만 정하면 되는 자리라,
 * 외부 라이브러리나 서버 호출 없이 유니코드 범위만으로 충분하다.
 *
 * 순서가 중요하다 — 한글이 있으면 한국어, 가나(히라가나/가타카나)가 있으면
 * 일본어로 먼저 판정한다(일본어 문장엔 한자도 섞이므로 한자 판정보다 먼저
 * 걸러야 한다). 둘 다 없이 한자만 있으면 중국어. 그 외(라틴 문자 등)는 영어로
 * 본다. 여러 언어가 섞인 글은 가장 먼저 매치되는 스크립트로 뭉뚱그려지는데,
 * "버튼을 보일지" 정도의 판단에는 그 정도로 충분하다.
 */
const HANGUL = /[가-힣ᄀ-ᇿ㄰-㆏]/;
const KANA = /[぀-ヿ]/;
const HAN = /[一-鿿㐀-䶿]/;

export function detectTextLocale(text: string): Locale {
  if (HANGUL.test(text)) return "ko";
  if (KANA.test(text)) return "ja";
  if (HAN.test(text)) return "zh";
  return "en";
}
