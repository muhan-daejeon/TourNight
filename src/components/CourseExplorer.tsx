"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Route,
  Users,
  Navigation,
  MapPin,
  Sparkles,
  Lightbulb,
  Loader2,
} from "lucide-react";
import CourseMap from "./CourseMap";
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

export default function CourseExplorer({ courses }: { courses: Course[] }) {
  const t = useTranslations("courses");
  const locale = useLocale();
  // 지도의 '코스 짜기'로 넘어오면 ?from=<contentId>가 붙는다
  const fromContentId = useSearchParams().get("from");

  const [aiCourse, setAiCourse] = useState<AiCourse | null>(null);
  const [aiState, setAiState] = useState<"idle" | "loading" | "error">(
    fromContentId ? "loading" : "idle",
  );
  // 선택 코스 id — null이면 첫 번째 코스
  const [selId, setSelId] = useState<string | null>(null);

  // 클라이언트 이동으로 from이 바뀌면 렌더 중에 초기화 (effect 안 setState 회피)
  const [lastFrom, setLastFrom] = useState(fromContentId);
  if (lastFrom !== fromContentId) {
    setLastFrom(fromContentId);
    setAiCourse(null);
    setAiState(fromContentId ? "loading" : "idle");
  }

  useEffect(() => {
    if (!fromContentId) return;
    const controller = new AbortController();
    fetch(
      `/api/ai-course?contentId=${encodeURIComponent(fromContentId)}&locale=${locale}`,
      { signal: controller.signal },
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { course: AiCourse }) => {
        setAiCourse(data.course);
        setAiState("idle");
        setSelId(data.course.id); // 방금 만든 코스를 바로 지도에 띄운다
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.warn("[courses] AI 코스 요청 실패:", err);
        setAiState("error");
      });
    return () => controller.abort();
  }, [fromContentId, locale]);

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
              <span className="flex items-center gap-1.5 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-slate-950">
                <Sparkles size={11} />
                {t("aiBadge")}
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

      {/* 지도 + 길찾기 */}
      {course && (
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="h-80 lg:h-[500px]">
            <CourseMap course={course} />
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
