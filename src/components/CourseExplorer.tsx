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
  BedDouble,
  Heart,
} from "lucide-react";
import CourseMap, { type MapMode } from "./CourseMap";
import RoutePanel, { formatDistance, hasRealRoute } from "./RoutePanel";
import CourseCustomizer from "./CourseCustomizer";
import { useSavedCourses, toSavedCourse } from "./useSavedCourses";
import { useCourseEdits, applyEdit } from "./useCourseEdits";
import { TransitLine } from "./TransitInfo";
import type { AiCourse, Course, CourseStop } from "@/lib/courses";

/**
 * 마지막으로 만든 AI 코스를 브라우저에 남긴다.
 * 새로고침하거나 다른 페이지를 다녀와도 계속 보이고, 새 코스를 짜면 교체된다.
 *
 * 키에 버전을 붙여, 코스 구조가 바뀌면 예전 데이터가 화면을 깨뜨리지 않고 무시된다.
 */
// v2: 대중교통 경로가 정류장 직선 근사 → 실제 도로 형상(loadLane)으로 바뀜.
// v1 저장본은 옛 직선 좌표가 박제돼 있어 지도에 건물을 가로지르는 선을 그린다.
const AI_COURSE_KEY = "tournight:aiCourse:v2";

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
          <span className="text-slate-400">
            <span className="text-slate-500">{si + 1}.</span> {s.title}
          </span>
          {si < course.stops.length - 1 && (
            <span className="flex items-center gap-1 text-slate-400">
              {course.legs[si]?.together && (
                <span className="flex items-center gap-0.5 rounded-full bg-amber-300/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
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
  science: "text-sky-600",
  nature: "text-emerald-600",
  festival: "text-pink-300",
  city: "text-amber-600",
};

/**
 * 명소 지도의 "코스 만들기"(?from=)로 들어와 AI가 짠 코스를 보는 화면.
 *
 * 예전에는 좌표로 묶어 자동 생성한 추천 코스 목록도 아래에 깔렸는데, 어떤
 * 기준으로 묶였는지가 화면에서 읽히지 않아 뺐다. 성향별 수제 코스는 성향
 * 결과 화면에서 바로 펼쳐 보여준다.
 */
export default function CourseExplorer({
  spots = [],
}: {
  /** 코스에 더할 수 있는 명소 전체 (코스 다듬기의 후보) */
  spots?: CourseStop[];
}) {
  const t = useTranslations("courses");
  const home = useTranslations("home");
  const ts = useTranslations("saved");
  const locale = useLocale();
  // 지도의 '코스 짜기'로 넘어오면 ?from=<contentId>(+켜둔 카테고리 필터)가 붙는다
  const searchParams = useSearchParams();
  const fromContentId = searchParams.get("from");
  const fromCategory = searchParams.get("category");

  // 저장된 코스 복원은 아래 effect에서 마운트 후에 한다.
  // useState 초기값에서 localStorage를 읽으면 서버 HTML(코스 없음)과
  // 클라이언트 첫 렌더(코스 있음)가 어긋나 hydration 오류로 트리가 통째로
  // 재생성된다 — 이때 카카오맵 초기화가 꼬여 지도가 죽는 문제가 있었다.
  const [aiCourse, setAiCourse] = useState<AiCourse | null>(null);
  const [aiState, setAiState] = useState<
    "idle" | "loading" | "error" | "limit"
  >(
    fromContentId ? "loading" : "idle",
  );
  // 선택 코스 id — null이면 첫 번째 코스
  const [selId, setSelId] = useState<string | null>(null);
  // 코스 찜 — 브라우저에 담아 두고 헤더의 하트(찜 모아보기)에서 다시 본다
  const { courses: savedCourses, toggle: toggleSaved } = useSavedCourses();
  // 내가 고친 코스 순서 — 새로고침해도 남도록 브라우저에 담아 둔다
  const { edits, setIds, reset: resetEdit } = useCourseEdits();
  // 지도에 그릴 이동수단 — 실제 경로가 붙은 AI 코스에서만 전환할 수 있다
  const [mapMode, setMapMode] = useState<MapMode>("best");

  // 클라이언트 이동으로 from·카테고리가 바뀌면 렌더 중에 초기화 (effect 안 setState 회피)
  const reqKey = `${fromContentId}|${fromCategory}`;
  const [lastKey, setLastKey] = useState(reqKey);
  if (lastKey !== reqKey) {
    setLastKey(reqKey);
    // 새로 짜러 왔으면 비우고 다시 받는다. 복원은 아래 effect 담당.
    setAiCourse(null);
    setAiState(fromContentId ? "loading" : "idle");
  }

  // 지난번에 만든 코스 되살리기 — 마운트 후에만 localStorage를 읽어
  // 서버 렌더와 첫 클라이언트 렌더를 일치시킨다 (hydration 안전)
  useEffect(() => {
    if (!fromContentId) {
      const saved = loadSavedCourse(locale);
      // 외부 저장소(localStorage) 동기화라 마운트 직후 한 번의 재렌더는 의도된 것
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setAiCourse(saved);
    }
  }, [fromContentId, locale]);

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

  // 고쳐 둔 순서가 있으면 그걸 입혀 보여준다. 원본(aiCourse)은 그대로 둬야
  // "처음 추천으로" 되돌릴 수 있다.
  const aiView = aiCourse
    ? (applyEdit(aiCourse, edits[aiCourse.id], spots) as AiCourse)
    : null;
  // 선택 없음(null)을 허용한다. 예전에는 ?? all[0]로 항상 하나가 켜져 있어서
  // 코스를 고르지 않은 상태를 만들 수 없었다.
  const course = aiView && aiView.id === selId ? aiView : null;
  /** 같은 카드를 다시 누르면 선택 해제 */
  const toggleCourse = (id: string) =>
    setSelId((prev) => (prev === id ? null : id));
  const start = course?.stops[0];
  const kakaoStart = start
    ? `https://map.kakao.com/link/to/${encodeURIComponent(start.title)},${start.mapY},${start.mapX}`
    : "";

  // 구간에 TMap 경로가 하나라도 붙어 있으면 도보/대중교통 전환을 노출한다
  const courseHasRealRoute = hasRealRoute(course);

  const cardClass = (active: boolean) =>
    `w-full rounded-2xl border p-4 text-left transition ${
      active
        ? "border-amber-300/60 bg-amber-300/[0.06]"
        : "border-slate-200 bg-slate-100 hover:border-slate-300"
    }`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* 코스 카드 목록 — AI가 짠 코스가 있으면 맨 위 */}
      <div className="space-y-3">
        {aiState === "loading" && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-4 text-sm text-amber-700/90">
            <Loader2 size={15} className="animate-spin" />
            {t("aiLoading")}
          </div>
        )}

        {aiState === "limit" && (
          <p className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-4 text-sm text-amber-700/90">
            {t("aiDailyLimit")}
          </p>
        )}

        {aiState === "error" && (
          <p className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-sm text-slate-400">
            {t("aiError")}
          </p>
        )}

        {aiView && (
          <button
            type="button"
            onClick={() => toggleCourse(aiView.id)}
            className={cardClass(course?.id === aiView.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="flex items-center gap-1.5 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-slate-950">
                  <Sparkles size={11} />
                  {t("aiBadge")}
                </span>
                {/* 홈에서 켜둔 카테고리 필터를 우선했음을 알림 */}
                {aiView.prefCategory && (
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                    {t("aiCategoryPref", {
                      category: home(`categories.${aiView.prefCategory}`),
                    })}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-600">
                <Route size={13} />
                {formatDistance(aiView.totalM)}
              </span>
            </div>
            <h3 className="mt-2 font-bold text-slate-900">{aiView.title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("stopsCount", { count: aiView.stops.length })} ·{" "}
              {(() => {
                // 여러 곳을 담아 만든 코스면 "첫 곳 외 N곳 포함"으로 표시
                const name =
                  aiView.stops.find((s) => s.contentId === aiView.anchorId)
                    ?.title ?? "";
                const extra = (aiView.anchorIds?.length ?? 1) - 1;
                return extra > 0
                  ? t("aiAnchorMulti", { name, count: extra })
                  : t("aiAnchor", { name });
              })()}
            </p>
            {aiView.summary && (
              <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
                {aiView.summary}
              </p>
            )}

            {/* 스팟별 방문 이유 (거리 폴백 코스는 이유가 없어 순서만 보여준다) */}
            {aiView.notes.some(Boolean) ? (
              <ol className="mt-3 space-y-2">
                {aiView.stops.map((s, i) => (
                  <li key={s.contentId} className="flex gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-600">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-slate-900">
                        {s.title}
                        <span
                          className={`text-[11px] font-medium ${CATEGORY_TEXT[s.category]}`}
                        >
                          {home(`categories.${s.category}`)}
                        </span>
                        {i > 0 && aiView.legs[i - 1] && (
                          <span className="text-[11px] font-medium text-slate-500">
                            {formatDistance(aiView.legs[i - 1].distanceM)}
                          </span>
                        )}
                        {i > 0 && aiView.legs[i - 1]?.together && (
                          <span className="flex items-center gap-0.5 rounded-full bg-amber-300/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                            <Users size={9} />
                            {t("together")}
                          </span>
                        )}
                      </p>
                      {aiView.notes[i] && (
                        <p className="mt-0.5 text-[12px] leading-relaxed text-slate-400">
                          {aiView.notes[i]}
                        </p>
                      )}
                      <span className="mt-1 flex">
                        <TransitLine transit={aiView.transit?.[i] ?? null} />
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <StopChain course={aiView} t={t} />
            )}

            {aiView.tip && (
              <p className="mt-3 flex gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-[12px] leading-relaxed text-slate-400">
                <Lightbulb size={13} className="mt-0.5 shrink-0 text-amber-600" />
                {aiView.tip}
              </p>
            )}
            {/* 코스가 끝나는 곳 인근 숙소 — 야간 소비를 숙박으로 연결 */}
            {aiView.stays.length > 0 && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-400">
                  <BedDouble size={13} className="text-amber-600" />
                  {t("staysNear", {
                    name: aiView.stops[aiView.stops.length - 1].title,
                  })}
                </p>
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {aiView.stays.map((s) => (
                    <a
                      key={s.contentId}
                      href={`https://map.kakao.com/link/to/${encodeURIComponent(s.title)},${s.mapY},${s.mapX}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="group w-32 shrink-0 overflow-hidden rounded-lg border border-slate-200 transition hover:border-indigo-300"
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
                        <p className="truncate text-[11px] font-semibold text-slate-400 group-hover:text-amber-600">
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

            <p className="mt-2 text-[11px] text-slate-400">
              {aiView.source === "ai" ? t("aiNote") : t("aiFallbackNote")}
            </p>
          </button>
        )}

        {/* 선택한 코스의 이동 정보 — 코스 카드 바로 아래 */}
        {course && courseHasRealRoute && aiCourse && course.id === aiCourse.id && (
          <RoutePanel course={course} mode={mapMode} setMode={setMapMode} />
        )}

        {/* AI 코스도 내 손으로 고칠 수 있다 */}
        {aiCourse && aiView && course?.id === aiView.id && (
          <CourseCustomizer
            course={aiView}
            baseIds={aiCourse.stops.map((st) => st.contentId)}
            pool={spots}
            onChange={(ids) => setIds(aiView.id, ids)}
            onReset={() => resetEdit(aiView.id)}
          />
        )}

        <p className="flex items-center gap-1.5 px-1 pt-1 text-[11px] text-slate-400">
          <MapPin size={11} />
          {t("dataNote")}
        </p>
      </div>

      {/* 선택이 없으면 지도 자리를 비워두지 않고 안내를 둔다 (레이아웃 유지) */}
      {!course && (
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/[0.02] px-6 text-center lg:h-[500px]">
            <p className="flex flex-col items-center gap-2 text-sm text-slate-500">
              <MapPin size={22} strokeWidth={1.5} className="text-slate-400" />
              {t("selectHint")}
            </p>
          </div>
        </div>
      )}

      {/* 지도 + 이동수단 전환 + 길찾기 */}
      {course && (
        // 둘러보기에서 코스 카드와 함께 지도까지 밝힌다
        <div data-tour="courses" className="lg:sticky lg:top-20 lg:self-start">
          <div className="h-80 lg:h-[500px]">
            <CourseMap course={course} mode={mapMode} />
          </div>
          <div className="mt-3 flex gap-2">
            <a
              href={kakaoStart}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-amber-400 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
            >
              <Navigation size={15} />
              {t("directions")}
            </a>
            {/* 코스 찜 — 담아 두면 헤더의 하트에서 다시 꺼내 볼 수 있다.
                AI 코스는 서버에 없어 되살릴 수 없으므로 경유지만 담긴다 */}
            <button
              type="button"
              onClick={() =>
                toggleSaved(
                  toSavedCourse(
                    course,
                    aiCourse && course.id === aiCourse.id ? "ai" : course.id.startsWith("persona-") ? "persona" : "recommended",
                    locale,
                  ),
                )
              }
              aria-pressed={savedCourses.some((c) => c.id === course.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition ${
                savedCourses.some((c) => c.id === course.id)
                  ? "bg-rose-500 text-white hover:bg-rose-600"
                  : "border border-rose-300 bg-white text-rose-500 hover:bg-rose-50"
              }`}
            >
              <Heart
                size={15}
                fill={savedCourses.some((c) => c.id === course.id) ? "currentColor" : "none"}
              />
              {savedCourses.some((c) => c.id === course.id) ? ts("saved") : ts("save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
