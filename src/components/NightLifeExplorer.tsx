"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  UtensilsCrossed,
  BedDouble,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import type { NightSpot } from "@/lib/kto";
import type { LocalKind } from "@/lib/kto-live";
import type { LocalSpotWithContext } from "@/lib/local-spots";
import { areaOf, type NightAreaId } from "@/lib/night-areas";
import PlaceCard, { PlaceChip } from "./PlaceCard";
import NightMap from "./NightMap";

/** 탭별 포인트 색 — 명소(앰버)와 다른 계열.
 *  badge는 사진 위 어두운 배지에 얹는 글자색이라 밝은 톤을 쓴다 */
const ACCENT: Record<
  LocalKind,
  { badge: string; chip: string; scene: string; Icon: LucideIcon }
> = {
  food: {
    badge: "text-rose-300",
    chip: "bg-rose-500 text-white",
    scene: "from-rose-950 via-slate-900 to-orange-950",
    Icon: UtensilsCrossed,
  },
  stay: {
    badge: "text-violet-300",
    chip: "bg-violet-500 text-white",
    scene: "from-violet-950 via-slate-900 to-indigo-950",
    Icon: BedDouble,
  },
  shopping: {
    badge: "text-emerald-300",
    chip: "bg-emerald-500 text-white",
    scene: "from-emerald-950 via-slate-900 to-teal-950",
    Icon: ShoppingBag,
  },
};

const AREA_ORDER: NightAreaId[] = ["yuseong", "dunsan", "expo", "downtown", "other"];

const fmt = (m: number) => (m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`);

/**
 * 나이트 라이프 탐색 — 맛집·숙소·쇼핑 탭의 본체.
 *
 * 야경명소 탭과 완전히 같은 틀: 검색창 → 필터 칩 → 왼쪽 2열 사진 카드 + 오른쪽
 * 고정 지도. 전에는 동네별 섹션으로 나눈 3열 격자에 지도가 없어서 탭을 옮기면
 * 다른 화면처럼 보였다. 동네 구분은 칩 필터로만 남긴다.
 *
 * 카드를 누르면 지도의 핀이 그 곳으로 가고, 핀을 누르면 카드가 밝혀진다 —
 * 명소 탭의 리스트↔지도 연동을 그대로 따른다. 지도 핀에서 "코스 짜기"는 없다
 * (맛집·숙소는 코스 경유지가 아니다).
 */
export default function NightLifeExplorer({
  kind,
  spots,
}: {
  kind: LocalKind;
  spots: LocalSpotWithContext[];
  /** 지금은 안 쓰지만 호출부(LocalSpotPage)가 넘기던 값 — 시그니처 유지 */
  nightSpots?: NightSpot[];
}) {
  const t = useTranslations("local");
  const th = useTranslations("home"); // 분류 배지·검색 문구는 명소 탭과 같은 라벨
  const [area, setArea] = useState<NightAreaId | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const accent = ACCENT[kind];

  /** 동네별 개수 — 칩 옆 숫자와 "있는 동네만 칩 노출"에 쓴다 */
  const counts = useMemo(() => {
    const c = new Map<NightAreaId, number>();
    for (const s of spots) {
      const id = areaOf(s);
      c.set(id, (c.get(id) ?? 0) + 1);
    }
    return c;
  }, [spots]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = spots.filter(
      (s) =>
        (area === "all" || areaOf(s) === area) &&
        (!q || s.title.toLowerCase().includes(q) || s.addr.toLowerCase().includes(q)),
    );
    // 야간 명소에 가까운 순 — 밤에 움직이기 좋은 곳이 앞에 온다
    return [...list].sort(
      (a, b) =>
        b.nearbyCount - a.nearbyCount ||
        (a.nearest?.distanceM ?? 1e9) - (b.nearest?.distanceM ?? 1e9),
    );
  }, [spots, area, query]);

  const visibleIds = useMemo(() => new Set(filtered.map((s) => s.contentId)), [filtered]);
  // 필터로 가려진 곳이 선택돼 있으면 지도가 엉뚱한 곳을 가리키지 않게 푼다
  const activeSelectedId =
    selectedId && visibleIds.has(selectedId) ? selectedId : null;

  /** 지도 컴포넌트는 명소 타입을 받는다 — 분류만 이 탭 이름으로 채워 넘긴다 */
  const mapSpots = useMemo<NightSpot[]>(
    () =>
      spots.map((s) => ({
        contentId: s.contentId,
        title: s.title,
        addr: s.addr,
        addrKo: s.addrKo,
        mapX: s.mapX,
        mapY: s.mapY,
        imageUrl: s.imageUrl,
        category: kind as unknown as NightSpot["category"],
      })),
    [spots, kind],
  );

  return (
    <div>
      {/* 검색창 — 명소 탭과 같은 모양 */}
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

      {/* 밤 동네 칩 (있는 동네만) */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", ...AREA_ORDER] as const)
          .filter((id) => id === "all" || (counts.get(id) ?? 0) > 0)
          .map((id) => (
            <button
              key={id}
              onClick={() => setArea(id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                area === id
                  ? "border-amber-400 bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.3)]"
                  : "border-slate-200 bg-slate-100 text-slate-400 backdrop-blur hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {id === "all" ? t("filterAll") : t(`areas.${id}`)}
              {id !== "all" && (
                <span className="text-[11px] opacity-60">{counts.get(id)}</span>
              )}
            </button>
          ))}
      </div>

      {/* 리스트 + 고정 지도 분할 뷰 — 명소 탭과 같은 비율 */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_560px]">
        <div className="order-2 grid content-start items-start gap-3 sm:grid-cols-2 lg:order-1">
          {filtered.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-10 text-center text-sm text-slate-500 sm:col-span-2">
              {th("noResults")}
            </p>
          )}
          {filtered.map((s) => (
            <PlaceCard
              key={s.contentId}
              href={`/${kind}/${s.contentId}`}
              imageUrl={s.imageUrl}
              title={s.title}
              subtitle={s.addr}
              badge={{
                label: th(`categories.${kind}`),
                Icon: accent.Icon,
                className: accent.badge,
              }}
              scene={accent.scene}
              fallbackIcon={accent.Icon}
              onClick={() => setSelectedId(s.contentId)}
              active={activeSelectedId === s.contentId}
              chips={
                s.nearbyCount > 0 || s.nearest ? (
                  <>
                    {s.nearbyCount > 0 && (
                      <PlaceChip className={accent.chip}>
                        {t("withinKm", { n: s.nearbyCount })}
                      </PlaceChip>
                    )}
                    {/* 밤에 이 근처에서 뭘 볼 수 있는지 — 이 탭의 존재 이유다 */}
                    {s.nearest && (
                      <PlaceChip>
                        {fmt(s.nearest.distanceM)} {s.nearest.title}
                      </PlaceChip>
                    )}
                  </>
                ) : undefined
              }
            />
          ))}
        </div>

        <div className="order-1 h-80 lg:order-2 lg:sticky lg:top-20 lg:h-[620px]">
          <NightMap
            spots={mapSpots}
            visibleIds={visibleIds}
            selectedId={activeSelectedId}
            onSelect={setSelectedId}
            detailPath={kind}
          />
        </div>
      </div>
    </div>
  );
}
