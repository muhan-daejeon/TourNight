"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

/** 슬라이드 배너 아래 스크롤 유도 — 클릭하면 다음 화면(콘텐츠 섹션)으로 부드럽게 이동 */
export default function ScrollDownHint({ targetId }: { targetId: string }) {
  const t = useTranslations("home");

  return (
    <button
      type="button"
      onClick={() =>
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" })
      }
      className="mx-auto mt-6 flex flex-col items-center gap-1 text-slate-500 transition hover:text-amber-300"
    >
      <span className="text-[11px] font-semibold tracking-[0.2em] uppercase">
        {t("scrollDown")}
      </span>
      <ChevronDown size={18} className="animate-bounce" />
    </button>
  );
}
