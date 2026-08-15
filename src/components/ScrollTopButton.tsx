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
      className="flex size-9 items-center justify-center rounded-full border border-white/15 text-slate-300 transition hover:border-amber-400/50 hover:text-amber-300"
    >
      <ArrowUp size={16} />
    </button>
  );
}
