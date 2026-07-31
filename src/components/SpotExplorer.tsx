"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  Telescope,
  Trees,
  Sparkles,
  Building2,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { NightSpot } from "@/lib/kto";
import NightMap from "./NightMap";

const CATEGORIES = ["all", "science", "nature", "festival", "city"] as const;

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

/** 이미지가 없을 때 쓰는 카테고리별 야간 그라데이션 썸네일 */
const CATEGORY_SCENE: Record<string, string> = {
  science: "from-sky-950 via-slate-900 to-cyan-950",
  nature: "from-emerald-950 via-slate-900 to-teal-950",
  festival: "from-fuchsia-950 via-slate-900 to-rose-950",
  city: "from-amber-950 via-slate-900 to-orange-950",
};

export default function SpotExplorer({ spots }: { spots: NightSpot[] }) {
  const t = useTranslations("home");
  const [category, setCategory] = useState<string>("all");

  const filtered =
    category === "all" ? spots : spots.filter((s) => s.category === category);

  return (
    <div>
      {/* 카테고리 필터 칩 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => {
          const Icon = c === "all" ? null : CATEGORY_ICON[c];
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                category === c
                  ? "border-amber-400 bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.3)]"
                  : "border-white/10 bg-white/5 text-slate-300 backdrop-blur hover:border-white/25 hover:text-white"
              }`}
            >
              {Icon && <Icon size={14} strokeWidth={2.2} />}
              {t(`categories.${c}`)}
            </button>
          );
        })}
      </div>

      {/* 리스트 + 고정 지도 분할 뷰 */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_560px]">
        <div className="order-2 flex flex-col gap-2.5 lg:order-1">
          {filtered.map((spot) => {
            const Icon = CATEGORY_ICON[spot.category];
            return (
              <article
                key={spot.contentId}
                className="glass-card group flex cursor-pointer items-center gap-3 rounded-xl p-2.5"
              >
                <div
                  className={`relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${CATEGORY_SCENE[spot.category]}`}
                >
                  {spot.imageUrl ? (
                    <Image
                      src={spot.imageUrl}
                      alt={spot.title}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <Icon
                      size={22}
                      strokeWidth={1.5}
                      className="text-white/30"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-semibold text-slate-100 group-hover:text-amber-300">
                    {spot.title}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-slate-500">
                    <span
                      className={`flex items-center gap-1 font-medium ${CATEGORY_TEXT[spot.category]}`}
                    >
                      <Icon size={11} strokeWidth={2.2} />
                      {t(`categories.${spot.category}`)}
                    </span>
                    <span className="text-slate-700">·</span>
                    <span className="truncate">{spot.addr}</span>
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  className="shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-amber-300"
                />
              </article>
            );
          })}
        </div>

        <div className="order-1 h-80 lg:order-2 lg:sticky lg:top-20 lg:h-[620px]">
          <NightMap spots={spots} activeCategory={category} />
        </div>
      </div>
    </div>
  );
}
