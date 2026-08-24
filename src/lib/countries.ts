// 회원가입 국가 선택 목록. code는 ISO 3166-1 alpha-2, name은 영문(드롭다운 공통 표기),
// flag는 유니코드 국기 이모지. 외국인 관광객 주요 국적 + 광범위 커버.
export interface Country {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "OT", name: "Other", flag: "🌐" },
];

const CODES = new Set(COUNTRIES.map((c) => c.code));

/** 유효한 국가 코드인지 (빈 값은 선택 안 함으로 허용) */
export function isValidCountry(code: string): boolean {
  return CODES.has(code);
}

export function countryByCode(code: string | null | undefined): Country | undefined {
  return code ? COUNTRIES.find((c) => c.code === code) : undefined;
}

/**
 * 국가 코드 → 앱 지원 언어(ko/en/ja/zh) 매핑.
 * 가입자의 국적에 맞는 초기 언어를 정할 때 쓴다. 지원 언어를 늘리면
 * routing.locales와 함께 여기 항목도 넓히면 된다.
 */
const COUNTRY_LOCALE: Record<string, string> = {
  KR: "ko",
  JP: "ja",
  CN: "zh",
  TW: "zh",
  HK: "zh",
};

/** 국적에 맞는 초기 언어. 미지원 국가·미선택은 외국인 기본값인 영어로 폴백 */
export function localeForCountry(code: string | null | undefined): string {
  return (code && COUNTRY_LOCALE[code]) || "en";
}
