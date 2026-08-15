"use client";

import { useLocale } from "next-intl";
import { ChevronDown, Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
};

/** 헤더에 짧게 보여줄 코드 (지역 코드 관례를 따른다) */
const LOCALE_CODES: Record<string, string> = {
  ko: "KR",
  en: "EN",
  ja: "JA",
  zh: "CN",
};

/**
 * 언어 전환 — 보이는 건 "🌐 KR ⌄"지만 실제 조작은 그 위에 투명하게 덮인
 * 네이티브 select가 받는다. 직접 만든 드롭다운보다 키보드·스크린리더·모바일
 * 기본 UI가 그대로 동작해서 안전하다.
 */
export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="relative flex shrink-0 items-center gap-1 rounded-full border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-white/25 hover:text-white">
      <Globe size={14} />
      {LOCALE_CODES[locale] ?? locale.toUpperCase()}
      <ChevronDown size={12} className="text-slate-500" />
      <select
        value={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value })}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Language"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l} className="bg-slate-900 text-slate-100">
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
