"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  Telescope,
  Trees,
  Sparkles,
  Building2,
  ChevronRight,
  Search,
  type LucideIcon,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
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
  const router = useRouter();
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 카테고리 + 텍스트(이름·주소) 동시 필터
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return spots.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        (s.addr ?? "").toLowerCase().includes(q)
      );
    });
  }, [spots, category, query]);

  // 지도 마커 표시 여부 판단용 — 현재 필터를 통과한 스팟 ID 집합
  const visibleIds = useMemo(
    () => new Set(filtered.map((s) => s.contentId)),
    [filtered],
  );

  // 선택된 스팟이 필터에서 빠지면 지도에 전달하지 않음 (오버레이 잔상 방지)
  const activeSelectedId =
    selectedId && visibleIds.has(selectedId) ? selectedId : null;

  return (
    <div>
      {/* 검색창 */}
      <div className="relative mb-3">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 backdrop-blur transition focus:border-amber-400/60 focus:bg-white/[0.07] focus:outline-none"
        />
      </div>

      {/* 카테고리 필터 칩 (스팟이 있는 카테고리만 노출) */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.filter(
          (c) => c === "all" || spots.some((s) => s.category === c),
        ).map((c) => {
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
        {/* 사진 카드가 커진 만큼 2열로 배치해 스크롤 길이를 유지한다 */}
        <div className="order-2 grid gap-3 sm:grid-cols-2 lg:order-1">
          {filtered.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-slate-500 sm:col-span-2">
              {t("noResults")}
            </p>
          )}
          {filtered.map((spot) => {
            const Icon = CATEGORY_ICON[spot.category];
            return (
              <article
                key={spot.contentId}
                onClick={() => setSelectedId(spot.contentId)}
                className={`glass-card group cursor-pointer overflow-hidden rounded-2xl ${
                  selectedId === spot.contentId
                    ? "!border-amber-400/60 !bg-amber-400/5"
                    : ""
                }`}
              >
                {/* 사진 우선 카드 — 야경 사진이 주인공, 텍스트는 사진 위에 얹는다 */}
                <div
                  className={`relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br sm:h-52 ${CATEGORY_SCENE[spot.category]}`}
                >
                  {spot.imageUrl ? (
                    <Image
                      src={spot.imageUrl}
                      alt={spot.title}
                      fill
                      sizes="(min-width: 1024px) 40vw, 100vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <Icon size={40} strokeWidth={1.2} className="text-white/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />

                  <span
                    className={`absolute left-3 top-3 flex items-center gap-1 rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold backdrop-blur ${CATEGORY_TEXT[spot.category]}`}
                  >
                    <Icon size={11} strokeWidth={2.4} />
                    {t(`categories.${spot.category}`)}
                  </span>

                  <div className="absolute inset-x-0 bottom-0 flex items-end gap-2 p-3.5">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] group-hover:text-amber-300">
                        {spot.title}
                      </h3>
                      <p className="truncate text-[13px] text-slate-300">
                        {spot.addr}
                      </p>
                    </div>
                    <Link
                      href={`/spots/${spot.contentId}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={spot.title}
                      className="shrink-0 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-amber-400 hover:text-slate-950"
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="order-1 h-80 lg:order-2 lg:sticky lg:top-20 lg:h-[620px]">
          <NightMap
            spots={spots}
            visibleIds={visibleIds}
            selectedId={activeSelectedId}
            onSelect={setSelectedId}
            // 코스 페이지에서 이 스팟을 거치는 AI 코스를 만들어 추천 코스와 함께 보여준다.
            // 켜둔 카테고리 필터도 넘겨 같은 계열 명소를 우선하게 한다 (강제는 아님)
            onPlanCourse={(contentId) =>
              router.push(
                `/courses?from=${encodeURIComponent(contentId)}` +
                  (category === "all" ? "" : `&category=${category}`),
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
