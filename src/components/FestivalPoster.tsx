"use client";

import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Festival } from "@/lib/festivals";

/** "8월" / "August" / "10월~11월" — 로케일 규칙은 Intl에 맡긴다 */
export function useSeasonLabel() {
  const locale = useLocale();
  const t = useTranslations("festivals");
  const monthName = (m: number) =>
    new Intl.DateTimeFormat(locale, { month: "long" }).format(
      new Date(2024, m - 1, 1),
    );
  return (f: Festival) =>
    f.startMonth === f.endMonth
      ? t("annualMonth", { month: monthName(f.startMonth) })
      : t("annualRange", {
          from: monthName(f.startMonth),
          to: monthName(f.endMonth),
        });
}

/**
 * 축제 포스터 카드 — 누르면 상세로 간다.
 *
 * 사진 대신 그라데이션 + 제목 타이포로 만든다. 축제 공식 포스터는 매년 바뀌고
 * 재배포 권리가 없어, 없는 사진을 채우기보다 축제마다 다른 색으로 구분한다.
 */
export default function FestivalPoster({ festival }: { festival: Festival }) {
  const t = useTranslations("festivals");
  const seasonLabel = useSeasonLabel();

  return (
    <Link
      href={`/festivals/${festival.id}`}
      className={`group relative flex aspect-[3/4] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b p-5 transition hover:-translate-y-1 hover:border-amber-400/40 hover:shadow-[0_12px_36px_rgba(0,0,0,0.5)] ${festival.gradient}`}
    >
      {/* 위쪽 빛무리 — 밋밋한 단색 그라데이션에 깊이를 준다 */}
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-40 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.18),transparent_70%)]" />

      <div className="relative flex items-center justify-between">
        <Sparkles size={16} className={festival.accent} strokeWidth={2.2} />
        {festival.inSeason && (
          <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950">
            {t("nowOpen")}
          </span>
        )}
      </div>

      <div className="relative mt-auto">
        <h3 className="text-lg font-extrabold leading-[1.28] tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] sm:text-xl">
          {festival.title}
        </h3>
        <p className={`mt-2.5 text-[13px] font-bold ${festival.accent}`}>
          {seasonLabel(festival)}
        </p>
        <p className="mt-1 line-clamp-2 text-xs text-slate-300">
          {festival.place}
        </p>
      </div>
    </Link>
  );
}
