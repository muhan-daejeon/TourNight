"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { MapPin, Route, Sparkles, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { NightSpot } from "@/lib/kto";
import type { LocalKind } from "@/lib/kto-live";
import type { LocalSpotWithContext } from "@/lib/local-spots";
import NightMap from "./NightMap";

const DISTRICTS = ["동구", "중구", "서구", "유성구", "대덕구"];

const fmt = (m: number) => (m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`);

/**
 * 맛집·숙박·쇼핑 탐색 — 야간 명소 탭과 같은 '카드 + 지도' 구성.
 * 카드마다 가장 가까운 야간 명소와 거리를 붙이고, 그 명소로 코스를 짜는 길을 연다.
 * 숙소는 1km 안 야간 명소 수(야경 접근성)로 정렬할 수 있다.
 */
export default function LocalExplorer({
  kind,
  spots,
}: {
  kind: LocalKind;
  spots: LocalSpotWithContext[];
}) {
  const t = useTranslations("local");
  const [district, setDistrict] = useState<string>("all");
  const [sort, setSort] = useState<"name" | "access">(kind === "stay" ? "access" : "name");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const districtOf = (s: LocalSpotWithContext) =>
    (s.addrKo ?? s.addr).match(/([가-힣]+구)/)?.[1] ?? null;

  const filtered = useMemo(() => {
    const list = spots.filter((s) => district === "all" || districtOf(s) === district);
    if (sort === "access")
      return [...list].sort(
        (a, b) => b.nearbyCount - a.nearbyCount || (a.nearest?.distanceM ?? 1e9) - (b.nearest?.distanceM ?? 1e9),
      );
    return list;
  }, [spots, district, sort]);

  // 지도는 야간 명소 카드와 같은 모양을 기대한다 — 분류만 이 탭 이름으로
  const mapSpots: NightSpot[] = useMemo(
    () => spots.map((s) => ({ ...s, category: kind as NightSpot["category"] })),
    [spots, kind],
  );
  const visibleIds = useMemo(() => new Set(filtered.map((s) => s.contentId)), [filtered]);
  const activeSelected = selectedId && visibleIds.has(selectedId) ? selectedId : null;

  return (
    <div>
      {/* 자치구 필터 + 정렬 */}
      <div className="flex flex-wrap items-center gap-2">
        {["all", ...DISTRICTS].map((d) => (
          <button
            key={d}
            onClick={() => setDistrict(d)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              district === d
                ? "border-amber-400 bg-amber-400 text-slate-950"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white"
            }`}
          >
            {d === "all" ? t("filterAll") : d}
          </button>
        ))}
        <button
          onClick={() => setSort((v) => (v === "access" ? "name" : "access"))}
          aria-pressed={sort === "access"}
          className={`ml-auto flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
            sort === "access"
              ? "border-indigo-400 bg-indigo-400/20 text-indigo-200"
              : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25"
          }`}
        >
          <Sparkles size={13} />
          {t("sortAccess")}
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_520px]">
        <div className="order-2 grid content-start gap-3 sm:grid-cols-2 lg:order-1">
          {filtered.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-slate-500 sm:col-span-2">
              {t("empty")}
            </p>
          )}
          {filtered.map((s) => (
            <article
              key={s.contentId}
              onClick={() => setSelectedId(s.contentId)}
              className={`group cursor-pointer overflow-hidden rounded-2xl border bg-white/[0.03] transition hover:-translate-y-0.5 hover:border-amber-400/40 ${
                selectedId === s.contentId ? "border-amber-400/60 bg-amber-400/5" : "border-white/10"
              }`}
            >
              <div className="relative h-40">
                <Image
                  src={s.imageUrl!}
                  alt={s.title}
                  fill
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                {s.nearbyCount > 0 && (
                  <span className="absolute left-3 top-3 rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur">
                    {t("withinKm", { n: s.nearbyCount })}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3.5">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] group-hover:text-amber-300">
                      {s.title}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-300">
                      <MapPin size={11} className="shrink-0" />
                      {s.addr}
                    </p>
                  </div>
                  <Link
                    href={`/${kind}/${s.contentId}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={s.title}
                    className="shrink-0 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-amber-400 hover:text-slate-950"
                  >
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>

              {/* 야간 명소와의 연결 — 이 탭이 여기 있는 이유 */}
              {s.nearest && (
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                  {/* 거리를 앞에 둔다 — 이름이 길어 잘려도 거리는 보이게 */}
                  <p className="min-w-0 truncate text-xs text-slate-400">
                    <span className="font-bold text-amber-300">{fmt(s.nearest.distanceM)}</span>{" "}
                    <span className="font-semibold text-slate-200">{s.nearest.title}</span>
                  </p>
                  <Link
                    href={`/courses?from=${s.nearest.contentId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex shrink-0 items-center gap-1 rounded-full border border-amber-400/40 px-2.5 py-1 text-[11px] font-bold text-amber-300 transition hover:bg-amber-400 hover:text-slate-950"
                  >
                    <Route size={11} />
                    {t("planNearby")}
                  </Link>
                </div>
              )}
            </article>
          ))}
        </div>

        <div className="order-1 h-80 lg:order-2 lg:sticky lg:top-24 lg:h-[640px]">
          <NightMap
            spots={mapSpots}
            visibleIds={visibleIds}
            selectedId={activeSelected}
            onSelect={setSelectedId}
            detailPath={kind}
          />
        </div>
      </div>
    </div>
  );
}
