"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { NightSpot } from "@/lib/kto";
import type { FestivalWithPeriod } from "@/lib/festivals";

/** 소개문에서 첫 문장만 — 포스터 아래 한 줄 설명 */
function oneLiner(spot: NightSpot): string {
  const overview = spot.overview
    ?.replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!overview) return spot.addr ?? "";
  const first = overview.split(/(?<=[.!?。])\s/)[0];
  return first.length > 50 ? first.slice(0, 50) + "…" : first;
}

/**
 * 축제 카드 — 사진 위에 글자를 얹는 어두운 포스터 대신, 사진 아래 흰 캡션
 * 영역에 제목·기간·한 줄 소개가 오는 밝은 카드 (라이트 테마 개편).
 *
 * 축제는 별도 데이터가 아니라 '축제' 카테고리로 등록된 야간 명소라서, 누르면
 * 그 명소 상세로 간다(지도·교통·가이드가 이미 거기 다 있다).
 */
/** "20260912" → "9.12" */
const md = (s: string) => `${+s.slice(4, 6)}.${+s.slice(6, 8)}`;

export default function FestivalPoster({
  spot,
}: {
  spot: NightSpot | FestivalWithPeriod;
}) {
  const t = useTranslations("home");
  const tf = useTranslations("festivals");
  const period = "period" in spot ? spot.period : null;
  const status = "status" in spot ? spot.status : null;
  const daysUntil = "daysUntil" in spot ? spot.daysUntil : null;
  const STATUS_STYLE: Record<string, string> = {
    ongoing: "bg-emerald-500 text-white",
    upcoming: "bg-amber-400 text-slate-950",
    ended: "bg-slate-600 text-white",
    past: "bg-white/90 text-slate-500",
  };

  return (
    <Link
      href={`/spots/${spot.contentId}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
    >
      {/* 사진 — 배지들만 사진 위에, 글자는 아래 캡션으로 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-200">
        {spot.imageUrl && (
          <Image
            src={spot.imageUrl}
            alt={spot.title}
            fill
            sizes="(min-width: 640px) 300px, 45vw"
            className="object-cover transition duration-500 group-hover:scale-[1.05]"
          />
        )}
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-daejeon-purple shadow-sm backdrop-blur">
          <Sparkles size={10} strokeWidth={2.6} />
          {t("categories.festival")}
        </span>
        {/* 개최 상태 — 진행 중 / D-n / 종료. 기간을 못 받은 축제는 배지를 달지 않는다 */}
        {status && (
          <span
            className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold shadow-sm ${STATUS_STYLE[status]}`}
          >
            {status === "upcoming" && daysUntil != null
              ? tf("dday", { n: daysUntil })
              : tf(status)}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="line-clamp-1 text-[15px] font-bold leading-snug text-slate-900 transition group-hover:text-daejeon-green sm:text-base">
          {spot.title}
        </h3>
        {period && (
          <p className="mt-1 text-[12px] font-bold text-daejeon-orange">
            {status === "past" && <span className="mr-1 font-semibold text-slate-400">{tf("lastYear")}</span>}
            {md(period.start)} – {md(period.end)}
          </p>
        )}
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-slate-500">
          {oneLiner(spot)}
        </p>
      </div>
    </Link>
  );
}
