"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

/** 슬라이드 배너 아래 스크롤 유도 — 클릭하면 SnapScreens와 같은 속도로 다음 화면으로 */
export default function ScrollDownHint() {
  const t = useTranslations("home");

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("tn-snap-next"))}
      className="mx-auto mt-6 flex flex-col items-center gap-1 text-slate-500 transition hover:text-amber-300"
    >
      <span className="text-[11px] font-semibold tracking-[0.2em] uppercase">
        {t("scrollDown")}
      </span>
      <ChevronDown size={18} className="animate-bounce" />
    </button>
  );
}
