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
  BedDouble,
} from "lucide-react";
import CourseMap, { type MapMode } from "./CourseMap";
import { TransitLine } from "./TransitInfo";
import type { AiCourse, Course } from "@/lib/courses";

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

  const [aiCourse, setAiCourse] = useState<AiCourse | null>(null);
  const [aiState, setAiState] = useState<"idle" | "loading" | "error">(
    fromContentId ? "loading" : "idle",
  );
  // 선택 코스 id — null이면 첫 번째 코스
  const [selId, setSelId] = useState<string | null>(null);
  // 지도에 그릴 이동수단 — 실제 경로가 붙은 AI 코스에서만 전환할 수 있다
  const [mapMode, setMapMode] = useState<MapMode>("straight");

  // 클라이언트 이동으로 from·카테고리가 바뀌면 렌더 중에 초기화 (effect 안 setState 회피)
  const reqKey = `${fromContentId}|${fromCategory}`;
  const [lastKey, setLastKey] = useState(reqKey);
  if (lastKey !== reqKey) {
    setLastKey(reqKey);
    setAiCourse(null);
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
        setAiState("idle");
        setSelId(data.course.id); // 방금 만든 코스를 바로 지도에 띄운다
        // 실제 경로가 있으면 직선 대신 그걸 먼저 보여준다.
        // 대중교통 우선 — 코스 구간은 대개 걸어가기엔 먼 거리다.
        const legs = data.course.legs;
        if (legs.some((l) => l.transit?.status === "ok")) setMapMode("transit");
        else if (legs.some((l) => l.walk?.status === "ok")) setMapMode("walk");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.warn("[courses] AI 코스 요청 실패:", err);
        setAiState("error");
      });
    return () => controller.abort();
  }, [fromContentId, fromCategory, locale]);

  if (!courses.length && !fromContentId) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">{t("empty")}</p>
    );
  }

  const all: Course[] = aiCourse ? [aiCourse, ...courses] : courses;
  const course = all.find((c) => c.id === selId) ?? all[0];
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

        {aiState === "error" && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
            {t("aiError")}
          </p>
        )}

        {aiCourse && (
          <button
            type="button"
            onClick={() => setSelId(aiCourse.id)}
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
              {t("aiAnchor", {
                name:
                  aiCourse.stops.find((s) => s.contentId === aiCourse.anchorId)
                    ?.title ?? "",
              })}
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

        {/* 기본 추천 코스 */}
        {aiCourse && courses.length > 0 && (
          <p className="px-1 pt-2 text-xs font-semibold text-slate-500">
            {t("presetHeading")}
          </p>
        )}
        {courses.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelId(c.id)}
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

      {/* 지도 + 이동수단 전환 + 길찾기 */}
      {course && (
        <div className="lg:sticky lg:top-20 lg:self-start">
          {/* 실제 경로가 있는 코스에서만 전환 노출 (추천 코스는 직선) */}
          {hasRealRoute && (
            <div className="mb-2 flex gap-1.5">
              {(
                [
                  ["straight", Route, t("modeStraight")],
                  ["transit", Bus, t("modeTransit")],
                  ["walk", Footprints, t("modeWalk")],
                ] as const
              ).map(([m, Icon, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMapMode(m)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    mapMode === m
                      ? "border-amber-400 bg-amber-400 text-slate-950"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white"
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="h-80 lg:h-[500px]">
            <CourseMap course={course} mode={mapMode} />
          </div>

          {/* 선택한 이동수단의 구간별 요약 */}
          {hasRealRoute && mapMode !== "straight" && (
            <ul className="mt-2 space-y-1">
              {course.legs.map((leg, i) => {
                const r = mapMode === "walk" ? leg.walk : leg.transit;
                const from = course.stops[i].title;
                const to = course.stops[i + 1].title;
                let detail: string;
                if (r?.status === "ok") {
                  const min = Math.round((r.durationSec ?? 0) / 60);
                  detail =
                    mapMode === "walk"
                      ? t("legWalk", { min })
                      : t("legTransit", {
                          min,
                          transfer: r.transferCount ?? 0,
                          fare: r.fare ?? 0,
                        });
                } else if (r?.status === "too_close") {
                  detail = t("legTooClose");
                } else {
                  detail = t("legNoRoute");
                }
                return (
                  <li key={i} className="flex gap-2 text-[12px] text-slate-400">
                    <span className="shrink-0 text-slate-600">
                      {i + 1}→{i + 2}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {from} → {to}
                    </span>
                    <span className="shrink-0 text-slate-300">{detail}</span>
                  </li>
                );
              })}
            </ul>
          )}
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
