"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  UtensilsCrossed,
  BedDouble,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { NightSpot } from "@/lib/kto";
import type { LocalKind } from "@/lib/kto-live";
import type { LocalSpotWithContext } from "@/lib/local-spots";
import { areaOf, NIGHT_AREAS, type NightAreaId } from "@/lib/night-areas";
import PlaceCard, { PlaceChip } from "./PlaceCard";

const fmt = (m: number) => (m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`);

/** 탭별 포인트 색 — 명소(앰버)와 다른 계열.
 *  badge는 사진 위 어두운 배지에 얹는 글자색이라 밝은 톤을 쓴다 */
const ACCENT: Record<
  LocalKind,
  { text: string; badge: string; chip: string; glow: string; scene: string; Icon: LucideIcon }
> = {
  food: {
    text: "text-rose-600",
    badge: "text-rose-300",
    chip: "bg-rose-500 text-white",
    glow: "from-rose-500/20",
    scene: "from-rose-950 via-slate-900 to-orange-950",
    Icon: UtensilsCrossed,
  },
  stay: {
    text: "text-violet-500",
    badge: "text-violet-300",
    chip: "bg-violet-500 text-white",
    glow: "from-violet-500/20",
    scene: "from-violet-950 via-slate-900 to-indigo-950",
    Icon: BedDouble,
  },
  shopping: {
    text: "text-emerald-600",
    badge: "text-emerald-300",
    chip: "bg-emerald-500 text-white",
    glow: "from-emerald-500/20",
    scene: "from-emerald-950 via-slate-900 to-teal-950",
    Icon: ShoppingBag,
  },
};

const AREA_ORDER: NightAreaId[] = ["yuseong", "dunsan", "expo", "downtown", "other"];

/**
 * 나이트 라이프 탐색 — 맛집·숙소·쇼핑 탭의 본체.
 *
 * 밤에 어디서 노는지는 동네 단위로 정해지므로 밤 동네별로 묶고, 동네 헤더에
 * 그 동네 야경 명소를 붙인다. 카드는 야경명소 탭과 같은 사진 카드(PlaceCard)다
 * — 전에는 번호 붙은 가로 줄 목록이라 탭을 옮기면 다른 사이트처럼 보였다.
 */
export default function NightLifeExplorer({
  kind,
  spots,
  nightSpots,
}: {
  kind: LocalKind;
  spots: LocalSpotWithContext[];
  nightSpots: NightSpot[];
}) {
  const t = useTranslations("local");
  const th = useTranslations("home"); // 분류 배지는 명소 탭과 같은 라벨을 쓴다
  const [area, setArea] = useState<NightAreaId | "all">("all");
  const accent = ACCENT[kind];

  const grouped = useMemo(() => {
    const g = new Map<NightAreaId, LocalSpotWithContext[]>();
    for (const s of spots) {
      const id = areaOf(s);
      g.set(id, [...(g.get(id) ?? []), s]);
    }
    // 동네 안에서는 야간 명소에 가까운 순 — 밤에 움직이기 좋은 곳이 앞에 온다
    for (const list of g.values())
      list.sort((a, b) => b.nearbyCount - a.nearbyCount || (a.nearest?.distanceM ?? 1e9) - (b.nearest?.distanceM ?? 1e9));
    return g;
  }, [spots]);

  /** 동네 헤더에 붙일 그 동네 야경 명소 (가까운 3곳) */
  const areaSpots = useMemo(() => {
    const m = new Map<NightAreaId, NightSpot[]>();
    for (const a of NIGHT_AREAS) {
      m.set(
        a.id,
        nightSpots.filter((n) => areaOf(n) === a.id).slice(0, 4),
      );
    }
    return m;
  }, [nightSpots]);

  const sections = AREA_ORDER.filter((id) => (grouped.get(id)?.length ?? 0) > 0).filter(
    (id) => area === "all" || id === area,
  );

  return (
    <div>
      {/* 밤 동네 선택 */}
      <div className="flex flex-wrap gap-2">
        {(["all", ...AREA_ORDER] as const)
          .filter((id) => id === "all" || (grouped.get(id)?.length ?? 0) > 0)
          .map((id) => (
            <button
              key={id}
              onClick={() => setArea(id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                area === id
                  ? "border-amber-400 bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.3)]"
                  : "border-slate-200 bg-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {id === "all" ? t("filterAll") : t(`areas.${id}`)}
              {id !== "all" && (
                <span className="ml-1.5 text-[11px] opacity-60">{grouped.get(id)?.length}</span>
              )}
            </button>
          ))}
      </div>

      <div className="mt-10 space-y-14">
        {sections.map((id) => {
          const list = grouped.get(id)!;
          const chips = areaSpots.get(id) ?? [];
          return (
            <section key={id}>
              {/* 동네 헤더 — 이 동네의 야경이 먼저, 그다음 먹고·자고·사는 곳.
                  '전체'에서는 여러 동네가 이어지므로 구분 제목 정도로만 낮춘다. 큰 카드로
                  두면 위 칩에서 그 동네를 고른 것처럼 읽힌다. */}
              <div
                className={
                  area === "all"
                    ? "flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between"
                    : "relative overflow-hidden rounded-3xl border border-slate-200 px-6 py-6 sm:px-8"
                }
              >
                {area !== "all" && (
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${accent.glow} via-transparent to-transparent`} />
                )}
                <div className={area === "all" ? "contents" : "relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"}>
                  <div>
                    {area !== "all" && (
                      <p className={`text-[11px] font-bold tracking-[0.2em] ${accent.text}`}>NIGHT AREA</p>
                    )}
                    <h2 className={area === "all" ? "flex items-baseline gap-2 text-lg font-bold tracking-tight" : "mt-1 text-2xl font-extrabold tracking-tight"}>
                      {t(`areas.${id}`)}
                      {area === "all" && <span className="text-xs font-semibold text-slate-500">{list.length}</span>}
                    </h2>
                    <p className={area === "all" ? "mt-0.5 text-xs text-slate-500" : "mt-1 text-sm text-slate-400"}>{t(`areaDesc.${id}`)}</p>
                  </div>
                  {chips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                      <Sparkles size={13} className="text-amber-600" />
                      <span className="mr-1 text-xs text-slate-400">{t("areaSpots")}</span>
                      {chips.map((n) => (
                        <Link
                          key={n.contentId}
                          href={`/spots/${n.contentId}`}
                          className="rounded-full border border-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-400 hover:text-slate-950"
                        >
                          {n.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 사진 카드 격자 — 야경명소 탭과 같은 카드 */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((s) => (
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
            </section>
          );
        })}
      </div>
    </div>
  );
}
