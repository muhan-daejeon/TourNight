"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { NightSpot } from "@/lib/kto";

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
 * 축제 포스터 카드 — 축제장 사진 위에 이름을 얹은 세로 포스터.
 *
 * 축제는 별도 데이터가 아니라 '축제' 카테고리로 등록된 야간 명소라서, 누르면
 * 그 명소 상세로 간다(지도·교통·가이드가 이미 거기 다 있다).
 */
export default function FestivalPoster({ spot }: { spot: NightSpot }) {
  const t = useTranslations("home");

  return (
    <Link
      href={`/spots/${spot.contentId}`}
      className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-slate-900 transition hover:-translate-y-1 hover:border-amber-400/40 hover:shadow-[0_12px_36px_rgba(0,0,0,0.5)]"
    >
      {spot.imageUrl && (
        <Image
          src={spot.imageUrl}
          alt={spot.title}
          fill
          sizes="(min-width: 640px) 220px, 45vw"
          className="object-cover transition duration-500 group-hover:scale-[1.05]"
        />
      )}
      {/* 사진 위 글씨가 읽히도록 아래를 짙게 깐다 */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/10" />

      <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-slate-950/70 px-2.5 py-1 text-[10px] font-bold text-pink-300 backdrop-blur">
        <Sparkles size={10} strokeWidth={2.6} />
        {t("categories.festival")}
      </span>

      <div className="relative p-4">
        <h3 className="text-[15px] font-extrabold leading-[1.3] tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] sm:text-base">
          {spot.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-slate-300">
          {oneLiner(spot)}
        </p>
      </div>
    </Link>
  );
}
