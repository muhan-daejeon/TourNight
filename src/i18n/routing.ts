import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ko", "en", "ja", "zh"],
  // 주 사용자가 외국인 관광객이므로 미지원 언어 브라우저는 영어로 폴백
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];
