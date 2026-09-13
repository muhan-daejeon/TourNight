"use client";

import { ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";

/** 푸터의 맨 위로 버튼 — html에 scroll-behavior:smooth가 걸려 있어 부드럽게 올라간다 */
export default function ScrollTopButton() {
  const t = useTranslations("footer");
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0 })}
      aria-label={t("toTop")}
      className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600"
    >
      <ArrowUp size={16} />
    </button>
  );
}
