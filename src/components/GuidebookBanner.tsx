"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/**
 * 홈 하단 가이드북 배너.
 *
 * 원래는 /etiquette로 이동하는 링크였지만, 지금은 프로필의 "둘러보기 다시보기"와
 * 똑같이 온보딩 투어를 다시 띄운다 (?tour=start) — 실제 가이드북 내용은 그 투어의
 * etiquette 단계에서 이어서 보여준다.
 */
export default function GuidebookBanner() {
  const t = useTranslations("home");
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/?tour=start")}
      className="group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/10 px-7 py-4 text-left transition hover:border-amber-400/40 sm:px-9"
    >
      <Image
        src="/hero-night.jpg"
        alt=""
        fill
        sizes="(min-width: 1152px) 1120px, 100vw"
        className="object-cover opacity-30"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-indigo-950/70" />

      <h2 className="relative text-xl font-extrabold tracking-tight text-white sm:text-2xl">
        Tour<span className="text-amber-400">Night</span> GUIDEBOOK
      </h2>
      <span className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition group-hover:bg-amber-300">
        {t("guidebookCta")}
        <ArrowRight size={16} />
      </span>
    </button>
  );
}
