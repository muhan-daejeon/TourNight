"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { NightSpot } from "@/lib/kto";

const CATEGORIES = ["all", "science", "nature", "festival", "city"] as const;

const CATEGORY_ICON: Record<string, string> = {
  science: "🔭",
  nature: "🌌",
  festival: "🎆",
  city: "🌉",
};

const CATEGORY_BADGE: Record<string, string> = {
  science: "bg-sky-500/15 text-sky-300",
  nature: "bg-emerald-500/15 text-emerald-300",
  festival: "bg-pink-500/15 text-pink-300",
  city: "bg-amber-500/15 text-amber-300",
};

export default function SpotList({ spots }: { spots: NightSpot[] }) {
  const t = useTranslations("home");
  const [category, setCategory] = useState<string>("all");

  const filtered =
    category === "all" ? spots : spots.filter((s) => s.category === category);

  return (
    <div>
      {/* 카테고리 필터 칩 */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              category === c
                ? "border-amber-400 bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.3)]"
                : "border-white/10 bg-white/5 text-slate-300 backdrop-blur hover:border-white/25 hover:text-white"
            }`}
          >
            {c !== "all" && (
              <span className="mr-1">{CATEGORY_ICON[c]}</span>
            )}
            {t(`categories.${c}`)}
          </button>
        ))}
      </div>

      {/* 카드 그리드 */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((spot) => (
          <article
            key={spot.contentId}
            className="glass-card group overflow-hidden rounded-2xl"
          >
            <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-b from-slate-800/60 to-slate-900/80">
              {spot.imageUrl ? (
                <Image
                  src={spot.imageUrl}
                  alt={spot.title}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <span className="text-5xl opacity-80 transition duration-300 group-hover:scale-110">
                  {CATEGORY_ICON[spot.category]}
                </span>
              )}
              <span
                className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur ${CATEGORY_BADGE[spot.category]}`}
              >
                {t(`categories.${spot.category}`)}
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-slate-100 group-hover:text-amber-300">
                {spot.title}
              </h3>
              <p className="mt-1 line-clamp-1 text-sm text-slate-400">
                {spot.addr}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
