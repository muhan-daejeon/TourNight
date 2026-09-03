"use client";

import Image from "next/image";
import { ArrowRight, BookOpen } from "lucide-react";
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
      className="group relative flex w-full flex-col items-start gap-6 overflow-hidden rounded-3xl border border-white/10 px-7 py-10 text-left transition hover:border-amber-400/40 sm:flex-row sm:items-center sm:px-12"
    >
      <Image
        src="/hero-night.jpg"
        alt=""
        fill
        sizes="(min-width: 1152px) 1120px, 100vw"
        className="object-cover opacity-50"
      />
      {/* 텍스트가 왼쪽에 있으므로 오른쪽은 일찍 풀어 야경 색이 보이게 한다 */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-indigo-950/40" />
      <div className="relative flex-1">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-slate-400">
          <BookOpen size={15} className="text-amber-300" />
          {t("guidebookOverline")}
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Tour<span className="text-amber-400">Night</span> GUIDEBOOK
        </h2>
        <p className="mt-2 text-sm text-slate-400">{t("guidebookSubtitle")}</p>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 transition group-hover:bg-amber-300">
          {t("guidebookCta")}
          <ArrowRight size={16} />
        </span>
      </div>

      {/* 가이드북 표지 — 시안의 책 이미지 자리. 실물 사진이 없으니 표지를
          직접 세워 둔다 (뒤에 한 권 겹쳐 두께를 만든다) */}
      <div className="relative hidden shrink-0 sm:block">
        <div className="absolute left-3 top-2 h-[168px] w-[124px] rotate-6 rounded-lg bg-indigo-900/70 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
        <div className="relative h-[176px] w-[130px] overflow-hidden rounded-lg border border-white/15 shadow-[0_14px_40px_rgba(0,0,0,0.6)] transition duration-500 group-hover:-translate-y-1">
          <Image
            src="/spots/hanbit-tower.jpg"
            alt=""
            fill
            sizes="130px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/70 to-slate-950/95" />
          {/* 책등 */}
          <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3.5">
            <p className="text-[13px] font-extrabold leading-tight text-white">
              Tour<span className="text-amber-400">Night</span>
            </p>
            <p className="mt-0.5 text-[9px] font-bold tracking-[0.2em] text-amber-300">
              GUIDEBOOK
            </p>
            <span className="mt-2 block h-px w-8 bg-amber-300/70" />
          </div>
        </div>
      </div>
    </button>
  );
}
