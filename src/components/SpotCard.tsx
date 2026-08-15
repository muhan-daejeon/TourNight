"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Telescope,
  Trees,
  Sparkles,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { NightSpot } from "@/lib/kto";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  science: Telescope,
  nature: Trees,
  festival: Sparkles,
  city: Building2,
};

const CATEGORY_TEXT: Record<string, string> = {
  science: "text-sky-300",
  nature: "text-emerald-300",
  festival: "text-pink-300",
  city: "text-amber-300",
};

/** 사진 없는 스팟용 카테고리 그라데이션 (SpotExplorer와 같은 계열) */
const CATEGORY_SCENE: Record<string, string> = {
  science: "from-sky-950 via-slate-900 to-cyan-950",
  nature: "from-emerald-950 via-slate-900 to-teal-950",
  festival: "from-fuchsia-950 via-slate-900 to-rose-950",
  city: "from-amber-950 via-slate-900 to-orange-950",
};

/**
 * 홈 야경명소 나열용 카드 — 사진 한 장에 이름·주소를 얹은 링크 카드.
 * 필터·지도·코스 담기가 붙은 SpotExplorer와 달리 상태가 없어 어디에나 놓을 수 있다.
 */
export default function SpotCard({ spot }: { spot: NightSpot }) {
  const t = useTranslations("home");
  const Icon = CATEGORY_ICON[spot.category] ?? Building2;

  return (
    <Link
      href={`/spots/${spot.contentId}`}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-1 hover:border-amber-400/40 hover:shadow-[0_12px_36px_rgba(0,0,0,0.5)]"
    >
      <div
        className={`relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br ${CATEGORY_SCENE[spot.category]}`}
      >
        {spot.imageUrl ? (
          <Image
            src={spot.imageUrl}
            alt={spot.title}
            fill
            sizes="(min-width: 640px) 280px, 80vw"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <Icon size={36} strokeWidth={1.2} className="text-white/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" />
      </div>
      <div className="p-3.5">
        <h3 className="truncate text-[15px] font-bold text-white group-hover:text-amber-300">
          {spot.title}
        </h3>
        <span
          className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold ${CATEGORY_TEXT[spot.category]}`}
        >
          <Icon size={11} strokeWidth={2.4} />#{t(`categories.${spot.category}`)}
        </span>
        <p className="mt-1 truncate text-xs text-slate-400">{spot.addr}</p>
      </div>
    </Link>
  );
}
