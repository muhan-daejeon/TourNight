"use client";

import { useTranslations } from "next-intl";
import { Bus, CarTaxiFront, Footprints, Sparkles, TrainFront } from "lucide-react";
import type { Course } from "@/lib/courses";
import type { MapMode } from "./CourseMap";
import { TAXI_NIGHT_SURCHARGE, pickBestMode } from "@/lib/transit-format";

/** 사람이 읽는 거리 표기 — 코스 만들기·타슈 코스가 함께 쓴다 */
export function formatDistance(m: number) {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

/** 구간에서 이 수단의 경로 (추천 모드는 구간마다 권하는 수단이 다르다) */
function routeOf(leg: Course["legs"][number], mode: MapMode) {
  const m = mode === "best" ? pickBestMode(leg) : mode;
  if (m === "walk") return leg.walk;
  if (m === "transit") return leg.transit;
  if (m === "taxi") return leg.taxi;
  return null;
}

/** 선택한 이동수단으로 코스 전체를 도는 데 드는 시간·요금 */
export function totalOf(course: Course, mode: MapMode) {
  if (mode === "straight") return null;
  let sec = 0;
  let fare = 0;
  let transfer = 0;
  let ok = false;
  for (const leg of course.legs) {
    const r = routeOf(leg, mode);
    if (r?.status !== "ok") continue;
    ok = true;
    sec += r.durationSec ?? 0;
    fare += r.fare ?? 0;
    transfer += r.transferCount ?? 0;
  }
  return ok ? { min: Math.round(sec / 60), fare, transfer } : null;
}

/** 구간에 TMap 경로가 하나라도 붙어 있으면 도보/대중교통 전환을 노출한다 —
 * 코스 만들기·타슈 코스가 같은 기준으로 RoutePanel 노출 여부를 정한다 */
export function hasRealRoute(course: Course | null | undefined): boolean {
  return Boolean(course?.legs.some((l) => l.walk || l.transit));
}

const MODE_ICON = {
  walk: Footprints,
  transit: Bus,
  taxi: CarTaxiFront,
} as const;

/** 번역 키 접미사 (modeWalk / modeTransit / modeTaxi) */
const MODE_KEY: Record<string, string> = {
  walk: "Walk",
  transit: "Transit",
  taxi: "Taxi",
  best: "Best",
};

/**
 * 이동 정보 패널 — 이동수단을 고르고 구간별 소요를 확인한다.
 * 코스 만들기(CourseExplorer)에서 쓰던 것을 그대로 옮겨, 타슈 추천 코스도
 * 같은 화면·같은 방식으로 코스를 짠다. 번역은 "courses" 네임스페이스를 쓴다.
 */
export default function RoutePanel({
  course,
  mode,
  setMode,
}: {
  course: Course;
  mode: MapMode;
  setMode: (m: MapMode) => void;
}) {
  const t = useTranslations("courses");
  // 직선은 사용자에게 의미가 없어 노출하지 않는다 (경로가 없을 때 지도만 직선으로 그림).
  // '추천'은 구간마다 가장 알맞은 수단을 섞어 안내한다.
  const modes = [
    ["best", Sparkles, t("modeBest")],
    ["transit", Bus, t("modeTransit")],
    ["walk", Footprints, t("modeWalk")],
    ["taxi", CarTaxiFront, t("modeTaxi")],
  ] as const;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
      <div className="flex flex-wrap gap-1.5">
        {modes.map(([m, Icon, label]) => {
          const total = totalOf(course, m);
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                mode === m
                  ? "border-amber-400 bg-amber-400 text-slate-950"
                  : "border-slate-200 bg-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <Icon size={14} />
              {label}
              {/* 고르기 전에도 얼마나 걸리는지 보이게 총 시간을 칩에 함께 표시 */}
              {total && (
                <span
                  className={mode === m ? "text-slate-900/70" : "text-slate-500"}
                >
                  {t("totalMin", { min: total.min })}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {mode !== "straight" &&
        (() => {
          const total = totalOf(course, mode);
          if (!total) return null;
          return (
            <div className="mt-3">
              <p className="text-sm font-bold text-amber-600">
                {mode === "best"
                  ? t("totalBest", {
                      min: total.min,
                      fare: total.fare.toLocaleString(),
                    })
                  : mode === "walk"
                  ? t("totalWalk", { min: total.min })
                  : mode === "taxi"
                    ? t("totalTaxi", {
                        min: total.min,
                        fare: total.fare.toLocaleString(),
                      })
                    : t("totalTransit", {
                        min: total.min,
                        transfer: total.transfer,
                        fare: total.fare,
                      })}
              </p>
              {/* 야간 이동이 많은 서비스라 심야 할증을 함께 알려준다 */}
              {mode === "taxi" && total.fare > 0 && (
                <p className="mt-0.5 text-[12px] text-slate-400">
                  {t("taxiNight", {
                    fare: Math.round(
                      total.fare * (1 + TAXI_NIGHT_SURCHARGE),
                    ).toLocaleString(),
                  })}
                </p>
              )}
            </div>
          );
        })()}

      {mode !== "straight" && (
        <ol className="mt-3 space-y-2.5">
          {course.legs.map((leg, i) => {
            // 수단을 직접 고른 경우엔 그 수단만 보여준다 (섞으면 무엇을 보는지 헷갈린다).
            // 추천 모드에서만 구간마다 알맞은 수단을 고른다.
            const picked =
              mode === "best"
                ? pickBestMode(leg)
                : (mode as "walk" | "transit" | "taxi");
            const r =
              picked === "walk"
                ? leg.walk
                : picked === "transit"
                  ? leg.transit
                  : picked === "taxi"
                    ? leg.taxi
                    : null;
            const LegIcon = picked ? MODE_ICON[picked] : null;

            let detail: string;
            if (r?.status === "ok") {
              const min = Math.round((r.durationSec ?? 0) / 60);
              detail =
                picked === "walk"
                  ? t("legWalk", { min })
                  : picked === "taxi"
                    ? t("legTaxi", { min, fare: (r.fare ?? 0).toLocaleString() })
                    : t("legTransit", {
                        min,
                        transfer: r.transferCount ?? 0,
                        fare: r.fare ?? 0,
                      });
            } else if (r?.status === "too_close") {
              detail = t("legTooClose");
            } else if (mode === "best") {
              detail = t("legNoRoute");
            } else {
              // 어떤 수단이 없는지 밝힌다 ("대중교통 경로 없음")
              detail = t("legNoRouteMode", { mode: t(`mode${MODE_KEY[mode]}`) });
            }
            // 그 수단이 없어도 걸어서 갈 만하면 알려준다 (가까운 구간에 헛걸음 방지)
            const walkMin = Math.round((leg.walk?.durationSec ?? 0) / 60);
            const walkHint =
              picked !== "walk" &&
              r?.status !== "ok" &&
              leg.walk?.status === "ok" &&
              walkMin <= 20
                ? t("legWalk", { min: walkMin })
                : null;
            const unavailable = !r || (r.status !== "ok" && r.status !== "too_close");
            return (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-400">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-slate-400">
                    {course.stops[i].title}
                    <span className="mx-1 text-slate-400">→</span>
                    {course.stops[i + 1].title}
                  </p>
                  <p
                    className={`flex items-center gap-1.5 text-[13px] font-semibold ${
                      unavailable ? "text-rose-600" : "text-slate-900"
                    }`}
                  >
                    {LegIcon && !unavailable && (
                      <LegIcon size={13} className="shrink-0 text-amber-600" />
                    )}
                    {detail}
                    {walkHint && (
                      <span className="flex items-center gap-1 text-[12px] font-medium text-slate-400">
                        <Footprints size={11} />
                        {walkHint}
                      </span>
                    )}
                  </p>

                  {/* 대중교통은 요약만으론 못 탄다 — 몇 번 버스를 어디서 타고
                      내리는지 단계별로 보여준다 (예전 캐시에는 정류장 정보가 없다) */}
                  {picked === "transit" &&
                    r?.status === "ok" &&
                    r.legs.some((sub) => sub.mode !== "WALK" && sub.startName) && (
                      <ol className="mt-1.5 space-y-1 border-l border-slate-200 pl-2.5">
                        {r.legs.map((sub, k) => {
                          if (sub.mode === "WALK") {
                            const m = Math.round((sub.durationSec ?? 0) / 60);
                            if (m < 2) return null;
                            return (
                              <li
                                key={k}
                                className="flex items-center gap-1.5 text-[12px] text-slate-400"
                              >
                                <Footprints size={11} className="shrink-0" />
                                {t("legWalk", { min: m })}
                              </li>
                            );
                          }
                          const SubIcon = sub.mode === "SUBWAY" ? TrainFront : Bus;
                          return (
                            <li
                              key={k}
                              className="flex items-start gap-1.5 text-[12px] text-slate-400"
                            >
                              <SubIcon
                                size={11}
                                className="mt-0.5 shrink-0 text-amber-600/80"
                              />
                              <span className="min-w-0">
                                <b className="text-slate-900">{sub.route}</b>{" "}
                                {t("stepRide", {
                                  start: sub.startName ?? "",
                                  end: sub.endName ?? "",
                                })}
                                {sub.stationCount
                                  ? ` · ${t("stepStations", { count: sub.stationCount })}`
                                  : ""}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
