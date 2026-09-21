"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import type { FestivalWithPeriod } from "@/lib/festivals";
import FestivalPoster from "./FestivalPoster";
import NightMap from "./NightMap";

type Filter = "all" | "ongoing" | "upcoming";

/**
 * 축제 탐색 — 야경명소 탭과 같은 틀(검색 → 칩 → 2열 카드 + 고정 지도).
 * 칩은 동네 대신 진행 상태(진행 중/예정)로 거른다. 축제 상세는 명소 상세로
 * 가므로 지도 핀의 "자세히 보기"도 /spots 로 간다.
 */
export default function FestivalExplorer({ festivals }: { festivals: FestivalWithPeriod[] }) {
  const t = useTranslations("festivals");
  const th = useTranslations("home");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return festivals.filter(
      (f) =>
        (filter === "all" || f.status === filter) &&
        (!q || f.title.toLowerCase().includes(q) || f.addr.toLowerCase().includes(q)),
    );
  }, [festivals, filter, query]);

  const visibleIds = useMemo(() => new Set(filtered.map((f) => f.contentId)), [filtered]);
  const activeSelectedId =
    selectedId && visibleIds.has(selectedId) ? selectedId : null;

  const counts = {
    ongoing: festivals.filter((f) => f.status === "ongoing").length,
    upcoming: festivals.filter((f) => f.status === "upcoming").length,
  };

  return (
    <div>
      <div className="relative mb-3">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={th("searchPlaceholder")}
          className="w-full rounded-full border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 backdrop-blur transition focus:border-amber-400 focus:bg-white/[0.07] focus:outline-none"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "ongoing", "upcoming"] as const)
          .filter((k) => k === "all" || counts[k] > 0)
          .map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                filter === k
                  ? "border-amber-400 bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.3)]"
                  : "border-slate-200 bg-slate-100 text-slate-400 backdrop-blur hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {k === "all" ? th("categories.all") : t(k)}
              {k !== "all" && <span className="text-[11px] opacity-60">{counts[k]}</span>}
            </button>
          ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_560px]">
        <div className="order-2 grid content-start items-start gap-3 sm:grid-cols-2 lg:order-1">
          {filtered.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-10 text-center text-sm text-slate-500 sm:col-span-2">
              {th("noResults")}
            </p>
          )}
          {filtered.map((f) => (
            <FestivalPoster
              key={f.contentId}
              spot={f}
              onClick={() => setSelectedId(f.contentId)}
              active={activeSelectedId === f.contentId}
            />
          ))}
        </div>

        <div className="order-1 h-80 lg:order-2 lg:sticky lg:top-20 lg:h-[620px]">
          <NightMap
            spots={festivals}
            visibleIds={visibleIds}
            selectedId={activeSelectedId}
            onSelect={setSelectedId}
          />
        </div>
      </div>
    </div>
  );
}
