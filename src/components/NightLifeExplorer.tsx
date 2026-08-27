"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { MapPin, Phone, Route, ChevronRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { NightSpot } from "@/lib/kto";
import type { LocalKind } from "@/lib/kto-live";
import type { LocalSpotWithContext } from "@/lib/local-spots";
import { areaOf, NIGHT_AREAS, type NightAreaId } from "@/lib/night-areas";

const fmt = (m: number) => (m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`);

/** 탭별 포인트 색 — 명소(앰버)와 다른 네온 계열 */
const ACCENT: Record<LocalKind, { text: string; ring: string; chip: string; glow: string }> = {
  food: { text: "text-rose-300", ring: "hover:border-rose-400/50", chip: "bg-rose-400/15 text-rose-200", glow: "from-rose-500/20" },
  stay: { text: "text-violet-300", ring: "hover:border-violet-400/50", chip: "bg-violet-400/15 text-violet-200", glow: "from-violet-500/20" },
  shopping: { text: "text-emerald-300", ring: "hover:border-emerald-400/50", chip: "bg-emerald-400/15 text-emerald-200", glow: "from-emerald-500/20" },
};

const AREA_ORDER: NightAreaId[] = ["yuseong", "dunsan", "expo", "downtown", "other"];

/**
 * 나이트 라이프 탐색 — 명소 탭(사진 격자 + 지도)과 일부러 다르게 간다.
 * 밤에 어디서 노는지는 동네 단위로 정해지므로, 밤 동네별로 묶어 매거진처럼
 * 세로로 흐르게 하고 동네 헤더에 그 동네 야경 명소를 붙인다.
 * 카드는 번호 붙은 가로형 행 — 훑어 내려가며 고르는 화면이다.
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
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                area === id
                  ? "border-white bg-white text-slate-950"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/30 hover:text-white"
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
              {/* 동네 헤더 — 이 동네의 야경이 먼저, 그다음 먹고·자고·사는 곳 */}
              <div className="relative overflow-hidden rounded-3xl border border-white/10 px-6 py-6 sm:px-8">
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${accent.glow} via-transparent to-transparent`} />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className={`text-[11px] font-bold tracking-[0.2em] ${accent.text}`}>NIGHT AREA</p>
                    <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{t(`areas.${id}`)}</h2>
                    <p className="mt-1 text-sm text-slate-400">{t(`areaDesc.${id}`)}</p>
                  </div>
                  {chips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                      <Sparkles size={13} className="text-amber-300" />
                      <span className="mr-1 text-xs text-slate-400">{t("areaSpots")}</span>
                      {chips.map((n) => (
                        <Link
                          key={n.contentId}
                          href={`/spots/${n.contentId}`}
                          className="rounded-full border border-amber-400/30 px-2.5 py-1 text-xs font-semibold text-amber-200 transition hover:bg-amber-400 hover:text-slate-950"
                        >
                          {n.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 가로형 행 목록 */}
              <ol className="mt-4 divide-y divide-white/[0.06]">
                {list.map((s, i) => (
                  <li key={s.contentId}>
                    <div className={`group flex gap-4 rounded-2xl border border-transparent px-2 py-4 transition ${accent.ring} hover:bg-white/[0.03]`}>
                      <span className={`w-7 shrink-0 pt-1 text-right text-lg font-black tabular-nums ${accent.text}`}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Link
                        href={`/${kind}/${s.contentId}`}
                        className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-900 sm:h-28 sm:w-44"
                      >
                        <Image
                          src={s.imageUrl!}
                          alt={s.title}
                          fill
                          sizes="176px"
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={`/${kind}/${s.contentId}`} className="block truncate text-base font-bold text-white group-hover:underline sm:text-lg">
                              {s.title}
                            </Link>
                            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                              <MapPin size={11} className="shrink-0" />
                              {s.addr}
                            </p>
                          </div>
                          <Link
                            href={`/${kind}/${s.contentId}`}
                            aria-label={s.title}
                            className="hidden shrink-0 rounded-full border border-white/10 p-2 text-slate-300 transition hover:bg-white hover:text-slate-950 sm:block"
                          >
                            <ChevronRight size={15} />
                          </Link>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                          {s.nearbyCount > 0 && (
                            <span className={`rounded-md px-2 py-0.5 font-bold ${accent.chip}`}>
                              {t("withinKm", { n: s.nearbyCount })}
                            </span>
                          )}
                          {s.nearest && (
                            <span className="text-slate-400">
                              <b className="text-amber-300">{fmt(s.nearest.distanceM)}</b> {s.nearest.title}
                            </span>
                          )}
                          {s.tel && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <Phone size={10} />
                              {s.tel}
                            </span>
                          )}
                        </div>

                        {s.nearest && (
                          <Link
                            href={`/courses?from=${s.nearest.contentId}`}
                            className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-amber-300 transition hover:text-amber-200"
                          >
                            <Route size={12} />
                            {t("planNearby")}
                            <ChevronRight size={12} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
