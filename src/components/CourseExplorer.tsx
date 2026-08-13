"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  Route,
  Users,
  Navigation,
  MapPin,
  Sparkles,
  Lightbulb,
  Loader2,
  Bus,
  Footprints,
  CarTaxiFront,
  BedDouble,
} from "lucide-react";
import CourseMap, { type MapMode } from "./CourseMap";
import { TransitLine } from "./TransitInfo";
import type { AiCourse, Course } from "@/lib/courses";
import { TAXI_NIGHT_SURCHARGE, pickBestMode } from "@/lib/transit-format";

/**
 * 마지막으로 만든 AI 코스를 브라우저에 남긴다.
 * 새로고침하거나 다른 페이지를 다녀와도 계속 보이고, 새 코스를 짜면 교체된다.
 *
 * 키에 버전을 붙여, 코스 구조가 바뀌면 예전 데이터가 화면을 깨뜨리지 않고 무시된다.
 */
const AI_COURSE_KEY = "tournight:aiCourse:v1";

function loadSavedCourse(locale: string): AiCourse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AI_COURSE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { locale?: string; course?: AiCourse };
    // 언어를 바꾼 뒤에 예전 언어로 된 코스를 보여주면 어색하다
    if (saved.locale !== locale) return null;
    return saved.course?.stops?.length ? saved.course : null;
  } catch {
    return null;
  }
}

function saveCourse(locale: string, course: AiCourse) {
  try {
    window.localStorage.setItem(
      AI_COURSE_KEY,
      JSON.stringify({ locale, course }),
    );
  } catch {
    // 용량 초과·프라이빗 모드 — 저장만 실패하고 화면은 그대로 동작한다
  }
}

function formatDistance(m: number) {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

/** 코스 안의 방문 순서 — 이름 사이에 '함께 방문' 배지와 화살표 */
function StopChain({
  course,
  t,
}: {
  course: Course;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[13px]">
      {course.stops.map((s, si) => (
        <span key={s.contentId} className="flex items-center gap-1.5">
          <span className="text-slate-200">
            <span className="text-slate-500">{si + 1}.</span> {s.title}
          </span>
          {si < course.stops.length - 1 && (
            <span className="flex items-center gap-1 text-slate-600">
              {course.legs[si]?.together && (
                <span className="flex items-center gap-0.5 rounded-full bg-amber-300/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                  <Users size={9} />
                  {t("together")}
                </span>
              )}
              <span>→</span>
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/** 선택한 이동수단으로 코스 전체를 도는 데 드는 시간·요금 */
/** 구간에서 이 수단의 경로 (추천 모드는 구간마다 권하는 수단이 다르다) */
function routeOf(leg: Course["legs"][number], mode: MapMode) {
  const m = mode === "best" ? pickBestMode(leg) : mode;
  if (m === "walk") return leg.walk;
  if (m === "transit") return leg.transit;
  if (m === "taxi") return leg.taxi;
  return null;
}

function totalOf(course: Course, mode: MapMode) {
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
 * 지도 옆 작은 목록으로는 눈에 띄지 않아 코스 카드 바로 아래로 옮겼다.
 */
function RoutePanel({
  course,
  mode,
  setMode,
  t,
}: {
  course: Course;
  mode: MapMode;
  setMode: (m: MapMode) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  // 직선은 사용자에게 의미가 없어 노출하지 않는다 (경로가 없을 때 지도만 직선으로 그림).
  // '추천'은 구간마다 가장 알맞은 수단을 섞어 안내한다.
  const modes = [
    ["best", Sparkles, t("modeBest")],
    ["transit", Bus, t("modeTransit")],
    ["walk", Footprints, t("modeWalk")],
    ["taxi", CarTaxiFront, t("modeTaxi")],
  ] as const;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
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
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white"
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
              <p className="text-sm font-bold text-amber-300">
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
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-slate-300">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-slate-300">
                    {course.stops[i].title}
                    <span className="mx-1 text-slate-600">→</span>
                    {course.stops[i + 1].title}
                  </p>
                  <p
                    className={`flex items-center gap-1.5 text-[13px] font-semibold ${
                      unavailable ? "text-rose-300" : "text-slate-100"
                    }`}
                  >
                    {LegIcon && !unavailable && (
                      <LegIcon size={13} className="shrink-0 text-amber-300" />
                    )}
                    {detail}
                    {walkHint && (
                      <span className="flex items-center gap-1 text-[12px] font-medium text-slate-400">
                        <Footprints size={11} />
                        {walkHint}
                      </span>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** 카테고리 배지 색 — 홈 리스트·지도 핀과 같은 계열 */
const CATEGORY_TEXT: Record<string, string> = {
  science: "text-sky-300",
  nature: "text-emerald-300",
  festival: "text-pink-300",
  city: "text-amber-300",
};

export default function CourseExplorer({ courses }: { courses: Course[] }) {
  const t = useTranslations("courses");
  const home = useTranslations("home");
  const locale = useLocale();
  // 지도의 '코스 짜기'로 넘어오면 ?from=<contentId>(+켜둔 카테고리 필터)가 붙는다
  const searchParams = useSearchParams();
  const fromContentId = searchParams.get("from");
  const fromCategory = searchParams.get("category");

  // 새로 짜러 온 게 아니면(?from= 없음) 지난번에 만든 코스를 되살린다
  const [aiCourse, setAiCourse] = useState<AiCourse | null>(() =>
    fromContentId ? null : loadSavedCourse(locale),
  );
  const [aiState, setAiState] = useState<
    "idle" | "loading" | "error" | "limit"
  >(
    fromContentId ? "loading" : "idle",
  );
  // 선택 코스 id — null이면 첫 번째 코스
  const [selId, setSelId] = useState<string | null>(null);
  // 지도에 그릴 이동수단 — 실제 경로가 붙은 AI 코스에서만 전환할 수 있다
  const [mapMode, setMapMode] = useState<MapMode>("best");

  // 클라이언트 이동으로 from·카테고리가 바뀌면 렌더 중에 초기화 (effect 안 setState 회피)
  const reqKey = `${fromContentId}|${fromCategory}`;
  const [lastKey, setLastKey] = useState(reqKey);
  if (lastKey !== reqKey) {
    setLastKey(reqKey);
    // 새로 짜러 왔으면 비우고 다시 받는다. 그냥 코스 페이지로 돌아온 경우라면
    // 지난번 코스를 되살린다 (안 그러면 여기서 지워져 유지가 무의미해진다).
    setAiCourse(fromContentId ? null : loadSavedCourse(locale));
    setAiState(fromContentId ? "loading" : "idle");
  }

  useEffect(() => {
    if (!fromContentId) return;
    const controller = new AbortController();
    fetch(
      `/api/ai-course?contentId=${encodeURIComponent(fromContentId)}&locale=${locale}` +
        (fromCategory ? `&category=${encodeURIComponent(fromCategory)}` : ""),
      { signal: controller.signal },
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { course: AiCourse }) => {
        setAiCourse(data.course);
        saveCourse(locale, data.course); // 새로 짠 코스로 교체 저장
        setAiState("idle");
        setSelId(data.course.id); // 방금 만든 코스를 바로 지도에 띄운다
        // 실제 경로가 있으면 직선 대신 그걸 먼저 보여준다.
        // 대중교통 우선 — 코스 구간은 대개 걸어가기엔 먼 거리다.
        setMapMode("best");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.warn("[courses] AI 코스 요청 실패:", err);
        // 429는 하루 생성 한도 — 실패가 아니라 안내가 필요한 상태다
        setAiState(err === 429 ? "limit" : "error");
      });
    return () => controller.abort();
  }, [fromContentId, fromCategory, locale]);

  if (!courses.length && !fromContentId) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">{t("empty")}</p>
    );
  }

  const all: Course[] = aiCourse ? [aiCourse, ...courses] : courses;
  // 선택 없음(null)을 허용한다. 예전에는 ?? all[0]로 항상 하나가 켜져 있어서
  // 코스를 고르지 않은 상태를 만들 수 없었다.
  const course = all.find((c) => c.id === selId) ?? null;
  /** 같은 카드를 다시 누르면 선택 해제 */
  const toggleCourse = (id: string) =>
    setSelId((prev) => (prev === id ? null : id));
  const start = course?.stops[0];
  const kakaoStart = start
    ? `https://map.kakao.com/link/to/${encodeURIComponent(start.title)},${start.mapY},${start.mapX}`
    : "";

  // 구간에 TMap 경로가 하나라도 붙어 있으면 도보/대중교통 전환을 노출한다
  const hasRealRoute = Boolean(
    course?.legs.some((l) => l.walk || l.transit),
  );

  const cardClass = (active: boolean) =>
    `w-full rounded-2xl border p-4 text-left transition ${
      active
        ? "border-amber-300/60 bg-amber-300/[0.06]"
        : "border-white/10 bg-white/[0.03] hover:border-white/20"
    }`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* 코스 카드 목록 — AI가 짠 코스가 있으면 맨 위 */}
      <div className="space-y-3">
        {aiState === "loading" && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-4 text-sm text-amber-200/90">
            <Loader2 size={15} className="animate-spin" />
            {t("aiLoading")}
          </div>
        )}

        {aiState === "limit" && (
          <p className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-4 text-sm text-amber-200/90">
            {t("aiDailyLimit")}
          </p>
        )}

        {aiState === "error" && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
            {t("aiError")}
          </p>
        )}

        {aiCourse && (
          <button
            type="button"
            onClick={() => toggleCourse(aiCourse.id)}
            className={cardClass(course?.id === aiCourse.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="flex items-center gap-1.5 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-slate-950">
                  <Sparkles size={11} />
                  {t("aiBadge")}
                </span>
                {/* 홈에서 켜둔 카테고리 필터를 우선했음을 알림 */}
                {aiCourse.prefCategory && (
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                    {t("aiCategoryPref", {
                      category: home(`categories.${aiCourse.prefCategory}`),
                    })}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-300/90">
                <Route size={13} />
                {formatDistance(aiCourse.totalM)}
              </span>
            </div>
            <h3 className="mt-2 font-bold text-slate-100">{aiCourse.title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("stopsCount", { count: aiCourse.stops.length })} ·{" "}
              {(() => {
                // 여러 곳을 담아 만든 코스면 "첫 곳 외 N곳 포함"으로 표시
                const name =
                  aiCourse.stops.find((s) => s.contentId === aiCourse.anchorId)
                    ?.title ?? "";
                const extra = (aiCourse.anchorIds?.length ?? 1) - 1;
                return extra > 0
                  ? t("aiAnchorMulti", { name, count: extra })
                  : t("aiAnchor", { name });
              })()}
            </p>
            {aiCourse.summary && (
              <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
                {aiCourse.summary}
              </p>
            )}

            {/* 스팟별 방문 이유 (거리 폴백 코스는 이유가 없어 순서만 보여준다) */}
            {aiCourse.notes.some(Boolean) ? (
              <ol className="mt-3 space-y-2">
                {aiCourse.stops.map((s, i) => (
                  <li key={s.contentId} className="flex gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-[11px] font-bold text-amber-300">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-slate-100">
                        {s.title}
                        <span
                          className={`text-[11px] font-medium ${CATEGORY_TEXT[s.category]}`}
                        >
                          {home(`categories.${s.category}`)}
                        </span>
                        {i > 0 && aiCourse.legs[i - 1] && (
                          <span className="text-[11px] font-medium text-slate-500">
                            {formatDistance(aiCourse.legs[i - 1].distanceM)}
                          </span>
                        )}
                        {i > 0 && aiCourse.legs[i - 1]?.together && (
                          <span className="flex items-center gap-0.5 rounded-full bg-amber-300/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                            <Users size={9} />
                            {t("together")}
                          </span>
                        )}
                      </p>
                      {aiCourse.notes[i] && (
                        <p className="mt-0.5 text-[12px] leading-relaxed text-slate-400">
                          {aiCourse.notes[i]}
                        </p>
                      )}
                      <span className="mt-1 flex">
                        <TransitLine transit={aiCourse.transit?.[i] ?? null} />
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <StopChain course={aiCourse} t={t} />
            )}

            {aiCourse.tip && (
              <p className="mt-3 flex gap-1.5 rounded-xl bg-white/[0.04] px-3 py-2 text-[12px] leading-relaxed text-slate-300">
                <Lightbulb size={13} className="mt-0.5 shrink-0 text-amber-300" />
                {aiCourse.tip}
              </p>
            )}
            {/* 코스가 끝나는 곳 인근 숙소 — 야간 소비를 숙박으로 연결 */}
            {aiCourse.stays.length > 0 && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-300">
                  <BedDouble size={13} className="text-amber-300" />
                  {t("staysNear", {
                    name: aiCourse.stops[aiCourse.stops.length - 1].title,
                  })}
                </p>
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {aiCourse.stays.map((s) => (
                    <a
                      key={s.contentId}
                      href={`https://map.kakao.com/link/to/${encodeURIComponent(s.title)},${s.mapY},${s.mapX}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="group w-32 shrink-0 overflow-hidden rounded-lg border border-white/10 transition hover:border-amber-300/50"
                    >
                      <div className="relative h-16 w-full">
                        <Image
                          src={s.imageUrl}
                          alt={s.title}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      </div>
                      <div className="p-1.5">
                        <p className="truncate text-[11px] font-semibold text-slate-200 group-hover:text-amber-300">
                          {s.title}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatDistance(s.distM)}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-2 text-[11px] text-slate-600">
              {aiCourse.source === "ai" ? t("aiNote") : t("aiFallbackNote")}
            </p>
          </button>
        )}

        {/* 선택한 코스의 이동 정보 — 코스 카드 바로 아래 */}
        {course && hasRealRoute && aiCourse && course.id === aiCourse.id && (
          <RoutePanel
            course={course}
            mode={mapMode}
            setMode={setMapMode}
            t={t}
          />
        )}

        {/* 기본 추천 코스 */}
        {aiCourse && courses.length > 0 && (
          <p className="px-1 pt-2 text-xs font-semibold text-slate-500">
            {t("presetHeading")}
          </p>
        )}
        {courses.map((c) => (
          <div key={c.id}>
          <button
            type="button"
            onClick={() => toggleCourse(c.id)}
            className={cardClass(course?.id === c.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-slate-100">
                {t("courseTitle", { name: c.stops[0].title })}
              </h3>
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-300/90">
                <Route size={13} />
                {formatDistance(c.totalM)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("stopsCount", { count: c.stops.length })}
            </p>
            <StopChain course={c} t={t} />
          </button>
          {/* 고른 코스면 그 아래에 이동 정보를 펼친다 */}
          {course?.id === c.id && hasRealRoute && (
            <div className="mt-3">
              <RoutePanel
                course={c}
                mode={mapMode}
                setMode={setMapMode}
                t={t}
              />
            </div>
          )}
          </div>
        ))}

        {!courses.length && aiState !== "loading" && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-500">
            {t("empty")}
          </p>
        )}

        <p className="flex items-center gap-1.5 px-1 pt-1 text-[11px] text-slate-600">
          <MapPin size={11} />
          {t("dataNote")}
        </p>
      </div>

      {/* 선택이 없으면 지도 자리를 비워두지 않고 안내를 둔다 (레이아웃 유지) */}
      {!course && (
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 text-center lg:h-[500px]">
            <p className="flex flex-col items-center gap-2 text-sm text-slate-500">
              <MapPin size={22} strokeWidth={1.5} className="text-slate-600" />
              {t("selectHint")}
            </p>
          </div>
        </div>
      )}

      {/* 지도 + 이동수단 전환 + 길찾기 */}
      {course && (
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="h-80 lg:h-[500px]">
            <CourseMap course={course} mode={mapMode} />
          </div>
          <a
            href={kakaoStart}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-full bg-amber-400 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
          >
            <Navigation size={15} />
            {t("directions")}
          </a>
        </div>
      )}
    </div>
  );
}
