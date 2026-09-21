"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Heart,
  Clock,
  Footprints,
  Bus,
  Car,
  LocateFixed,
  MapPin,
  Moon,
  Sparkles,
  Users,
  UtensilsCrossed,
  AlertTriangle,
} from "lucide-react";
import type { Course, CourseStop } from "@/lib/courses";
import CourseMap, { type MapMode } from "./CourseMap";
import CourseCustomizer from "./CourseCustomizer";
import { useSavedCourses, toSavedCourse } from "./useSavedCourses";
import { useCourseEdits, applyEdit } from "./useCourseEdits";

/** 출발지를 직접 고를 때 쓰는 대전 주요 거점 — GPS를 못 쓰거나 거부했을 때 */
const ANCHORS = [
  { key: "daejeon", mapX: 127.4344, mapY: 36.3324 },
  { key: "yuseong", mapX: 127.3435, mapY: 36.3546 },
  { key: "dunsan", mapX: 127.3789, mapY: 36.3515 },
  { key: "expo", mapX: 127.3888, mapY: 36.3745 },
] as const;

const DURATIONS = [60, 120, 180, 240] as const;

const TRANSPORTS = [
  { key: "walk", Icon: Footprints },
  { key: "transit", Icon: Bus },
  { key: "taxi", Icon: Car },
] as const;

const COMPANIONS = ["solo", "couple", "friends", "family"] as const;
const PACES = ["light", "lots"] as const;
const MOODS = ["calm", "lively"] as const;
const THEMES = ["nature", "city", "science", "festival"] as const;

/** 서버가 돌려주는 맞춤 코스 (courses.ts SurveyCourse) */
interface SurveyCourse extends Course {
  title: string;
  summary: string;
  tip: string;
  notes: string[];
  transit: ({ nodeName: string; lastBus: string | null } | null)[];
  info: { congestion: number | null }[];
  /** 야식을 넣기로 했을 때의 식당 후보 (영업시간 원문 포함) */
  foods: {
    contentId: string;
    title: string;
    addr: string;
    distM: number;
    mapX: number;
    mapY: number;
    hours: string | null;
    restDay: string | null;
  }[];
  source: "ai" | "distance";
  applied: {
    startTime: string;
    endTime: string;
    durationMin: number;
    transport: "walk" | "transit" | "taxi";
    targetStops: number;
  };
}

/**
 * 방금 만든 맞춤 코스를 브라우저에 남긴다.
 *
 * 새로고침하거나 다른 페이지를 다녀오면 코스가 통째로 사라져, 한도(하루 5회)를
 * 써 가며 다시 만들어야 했다. AI 코스(CourseExplorer)가 쓰는 방식 그대로
 * 마지막 결과 하나만 담아 두고, 새로 만들면 교체한다.
 *
 * 키에 버전을 붙여 코스 구조가 바뀌면 옛 저장본이 화면을 깨뜨리지 않고 무시된다.
 * (v1: 야식 후보 foods가 더해진 구조)
 */
const SURVEY_COURSE_KEY = "tournight:surveyCourse:v1";

/**
 * localStorage는 브라우저 단위라 계정과 무관하게 남는다 — 다른 계정으로
 * 로그인했거나 로그아웃한 상태에서 남의(또는 예전) 코스가 "지난번에 만든
 * 코스"로 뜨는 문제가 있어, 만든 사람의 userId를 같이 적고 같은 사람일 때만 꺼낸다.
 */
function loadSurveyCourse(locale: string, userId: number): SurveyCourse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SURVEY_COURSE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as {
      locale?: string;
      userId?: number;
      course?: SurveyCourse;
    };
    if (saved.userId !== userId) return null;
    // 언어를 바꾼 뒤 예전 언어로 된 코스를 보여주면 어색하다
    if (saved.locale !== locale) return null;
    return saved.course?.stops?.length ? saved.course : null;
  } catch {
    return null;
  }
}

function saveSurveyCourse(locale: string, userId: number | null, course: SurveyCourse) {
  // 누가 만들었는지 모르면 남기지 않는다 — 다음에 누구에게 보여줄지 정할 수 없다
  if (userId === null) return;
  try {
    window.localStorage.setItem(
      SURVEY_COURSE_KEY,
      JSON.stringify({ locale, userId, course }),
    );
  } catch {
    // 용량 초과·프라이빗 모드 — 저장만 실패하고 화면은 그대로 동작한다
  }
}

/** 지금 시각을 "HH:MM"으로 (분은 30 단위로 내림 — 고르기 쉽게) */
function nowRounded(): string {
  const d = new Date();
  const m = d.getMinutes() < 30 ? 0 : 30;
  return `${String(d.getHours()).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const chip = (on: boolean) =>
  `flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
    on
      ? "border-amber-400 bg-amber-400 text-slate-950"
      : "border-slate-200 bg-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-900"
  }`;

export default function CourseSurvey({
  spots = [],
}: {
  /** 코스 다듬기에서 더할 수 있는 명소 전체 */
  spots?: CourseStop[];
} = {}) {
  const t = useTranslations("survey");
  const tc = useTranslations("courses");
  const locale = useLocale();

  const [origin, setOrigin] = useState<{
    mapX: number;
    mapY: number;
    label: string;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [startTime, setStartTime] = useState(nowRounded);
  const [durationMin, setDurationMin] = useState<number>(120);
  const [transport, setTransport] = useState<"walk" | "transit" | "taxi">(
    "transit",
  );
  const [companion, setCompanion] =
    useState<(typeof COMPANIONS)[number]>("solo");
  const [pace, setPace] = useState<(typeof PACES)[number]>("lots");
  const [mood, setMood] = useState<(typeof MOODS)[number]>("calm");
  const [wantsFood, setWantsFood] = useState(false);
  const [themes, setThemes] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<SurveyCourse | null>(null);
  // 지난번에 만든 코스 — 자동으로 펼치지 않고 "다시 보기" 버튼 뒤에 둔다.
  // 설문을 건드리기도 전에 결과가 떠 있으면 기본 코스처럼 오해된다는 피드백
  const [savedCourse, setSavedCourse] = useState<SurveyCourse | null>(null);

  // 현재 로그인 사용자 id — 저장한 코스를 누구에게 보여줄지 가르는 기준.
  // 코스 생성 자체가 로그인 필수라, 없으면 저장도 복원도 하지 않는다
  const [meId, setMeId] = useState<number | null>(null);

  // 마운트 후 로그인 사용자를 확인한 뒤에야 localStorage를 읽는다 — 서버
  // 렌더와 첫 클라이언트 렌더를 일치시키고(hydration 안전), 남의 코스를
  // 꺼내지 않는다
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user?: { id: number } | null }) => {
        if (cancelled) return;
        const id = d.user?.id ?? null;
        setMeId(id);
        setSavedCourse(id === null ? null : loadSurveyCourse(locale, id));
      })
      .catch(() => {
        if (!cancelled) setSavedCourse(null);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);
  const [mode, setMode] = useState<MapMode>("best");

  /** 브라우저 위치 — 좌표는 코스 계산에만 쓰고 서버에 저장하지 않는다 */
  function useMyLocation() {
    if (!navigator.geolocation) {
      setError(t("gpsUnsupported"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setOrigin({
          mapX: pos.coords.longitude,
          mapY: pos.coords.latitude,
          label: t("myLocation"),
        });
        setError(null);
      },
      () => {
        setLocating(false);
        setError(t("gpsDenied"));
      },
      { timeout: 10_000 },
    );
  }

  async function submit() {
    if (!origin || loading) return;
    setLoading(true);
    setError(null);
    setCourse(null);
    try {
      const res = await fetch("/api/course-survey", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mapX: origin.mapX,
          mapY: origin.mapY,
          startTime,
          durationMin,
          transport,
          companion,
          pace,
          mood,
          wantsFood,
          categories: themes,
          locale,
          date: today(),
        }),
      });
      if (res.status === 401) {
        setError(t("loginRequired"));
        return;
      }
      if (res.status === 429) {
        const d = await res.json().catch(() => ({}));
        setError(t("limitReached", { limit: d.limit ?? 5 }));
        return;
      }
      if (res.status === 404) {
        setError(t("noCandidates"));
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCourse(data.course);
      setSavedCourse(null); // 새 결과가 떠 있으니 "다시 보기" 안내는 접는다
      saveSurveyCourse(locale, meId, data.course); // 새로 만든 코스로 교체 저장
      // 이동 수단을 고른 대로 지도에도 맞춰 준다
      setMode(transport);
    } catch {
      setError(t("failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-7 rounded-2xl border border-slate-200 bg-slate-100 p-6">
        {/* 1. 출발지 */}
        <fieldset>
          <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-400">
            <MapPin size={15} className="text-amber-600" />
            {t("q1")}
          </legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className={chip(origin?.label === t("myLocation"))}
            >
              <LocateFixed size={14} />
              {locating ? t("locating") : t("myLocation")}
            </button>
            {ANCHORS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() =>
                  setOrigin({
                    mapX: a.mapX,
                    mapY: a.mapY,
                    label: t(`places.${a.key}`),
                  })
                }
                className={chip(origin?.label === t(`places.${a.key}`))}
              >
                {t(`places.${a.key}`)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{t("gpsNote")}</p>
        </fieldset>

        {/* 2. 언제, 얼마나 */}
        <fieldset>
          <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-400">
            <Clock size={15} className="text-amber-600" />
            {t("q2")}
          </legend>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              aria-label={t("startTime")}
              className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400"
            />
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDurationMin(d)}
                className={chip(durationMin === d)}
              >
                {t("hours", { h: d / 60 })}
              </button>
            ))}
          </div>
        </fieldset>

        {/* 3. 이동 수단 */}
        <fieldset>
          <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-400">
            <Bus size={15} className="text-amber-600" />
            {t("q3")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {TRANSPORTS.map(({ key, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTransport(key)}
                className={chip(transport === key)}
              >
                <Icon size={14} />
                {t(`transports.${key}`)}
              </button>
            ))}
          </div>
        </fieldset>

        {/* 4. 동행 */}
        <fieldset>
          <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-400">
            <Users size={15} className="text-amber-600" />
            {t("q4")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {COMPANIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCompanion(c)}
                className={chip(companion === c)}
              >
                {t(`companions.${c}`)}
              </button>
            ))}
          </div>
        </fieldset>

        {/* 5. 걷는 양 — light면 서버가 이동 시간을 느긋하게 잡아 스팟이 붙는다 */}
        <fieldset>
          <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-400">
            <Footprints size={15} className="text-amber-600" />
            {t("q6")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {PACES.map((p) => (
              <button key={p} type="button" onClick={() => setPace(p)} className={chip(pace === p)}>
                {t(`paces.${p}`)}
              </button>
            ))}
          </div>
        </fieldset>

        {/* 6. 분위기 — 혼잡도 예측을 읽는 방향이 바뀐다 (조용=한산 우대, 활기=붐빔 환영) */}
        <fieldset>
          <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-400">
            <Moon size={15} className="text-amber-600" />
            {t("q7")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button key={m} type="button" onClick={() => setMood(m)} className={chip(mood === m)}>
                {t(`moods.${m}`)}
              </button>
            ))}
          </div>
        </fieldset>

        {/* 7. 야식 — 켜면 서버가 40분을 예산에서 빼고 코스를 짠다 */}
        <fieldset>
          <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-400">
            <UtensilsCrossed size={15} className="text-amber-600" />
            {t("q8")}
          </legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setWantsFood(true)} className={chip(wantsFood)}>
              {t("food.yes")}
            </button>
            <button type="button" onClick={() => setWantsFood(false)} className={chip(!wantsFood)}>
              {t("food.no")}
            </button>
          </div>
          {wantsFood && <p className="mt-2 text-xs text-slate-400">{t("food.note")}</p>}
        </fieldset>

        {/* 8. 테마 (복수) */}
        <fieldset>
          <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-400">
            <Sparkles size={15} className="text-amber-600" />
            {t("q5")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((th) => (
              <button
                key={th}
                type="button"
                onClick={() =>
                  setThemes((prev) =>
                    prev.includes(th)
                      ? prev.filter((x) => x !== th)
                      : [...prev, th],
                  )
                }
                className={chip(themes.includes(th))}
              >
                {t(`themes.${th}`)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{t("themeNote")}</p>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={submit}
            disabled={!origin || loading}
            className="flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles size={15} />
            {loading ? t("planning") : t("submit")}
          </button>
          {!origin && <span className="text-xs text-slate-500">{t("needOrigin")}</span>}
        </div>

        {error && (
          <p className="rounded-xl border border-rose-400/25 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}
      </div>

      {savedCourse && !course && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/50 bg-amber-50 px-5 py-4">
          <p className="text-sm text-slate-700">{t("savedBanner")}</p>
          <button
            type="button"
            onClick={() => {
              setCourse(savedCourse);
              setSavedCourse(null);
            }}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600"
          >
            {t("savedShow")}
          </button>
        </div>
      )}

      {course && (
        <SurveyResult
          course={course}
          mode={mode}
          onMode={setMode}
          tc={tc}
          spots={spots}
        />
      )}
    </div>
  );
}

/** 결과 — 왜 이 코스인지 근거를 함께 보여준다 */
function SurveyResult({
  course,
  mode,
  onMode,
  tc,
  spots,
}: {
  course: SurveyCourse;
  mode: MapMode;
  onMode: (m: MapMode) => void;
  tc: ReturnType<typeof useTranslations>;
  spots: CourseStop[];
}) {
  const t = useTranslations("survey");
  const ts = useTranslations("saved");
  const locale = useLocale();
  const a = course.applied;
  // 코스 찜 — 담아 두면 헤더의 하트(찜 모아보기)에서 다시 꺼내 본다.
  // 설문 코스는 서버에 없어 되살릴 수 없으므로 경유지만 담긴다
  const { courses: savedCourses, toggle: toggleSaved } = useSavedCourses();
  const savedNow = savedCourses.some((c) => c.id === course.id);
  // 내가 고친 순서 — 아래 다듬기 패널이 이 값을 보여주고 고친다
  const { edits, setIds, reset: resetEdit } = useCourseEdits();
  const edited = applyEdit(course, edits[course.id], spots);

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-100 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {course.title && (
            <h2 className="text-xl font-bold tracking-tight">{course.title}</h2>
          )}
        </div>
        {/* 아이콘만 두면 흰 카드 위에서 눈에 띄지 않아 글자를 붙인 색 버튼으로 */}
        <button
          type="button"
          onClick={() =>
            toggleSaved(toSavedCourse(course, "survey", locale, course.title))
          }
          aria-pressed={savedNow}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${
            savedNow
              ? "bg-rose-500 text-white hover:bg-rose-600"
              : "border border-rose-300 bg-white text-rose-500 hover:bg-rose-50"
          }`}
        >
          <Heart size={15} fill={savedNow ? "currentColor" : "none"} />
          {savedNow ? ts("saved") : ts("save")}
        </button>
      </div>
      {course.summary && (
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {course.summary}
        </p>
      )}

      {/* 적용된 조건 — 설문 답변이 실제 제약으로 쓰였다는 근거 */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-slate-400">
          {a.startTime} – {a.endTime}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-slate-400">
          {t(`transports.${a.transport}`)}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-slate-400">
          {t("stopsCount", { n: course.stops.length })}
        </span>
        {course.source === "distance" && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700">
            {tc("aiFallbackNote")}
          </span>
        )}
      </div>

      <div className="mt-5 h-80 sm:h-[420px]">
        <CourseMap course={course} mode={mode} foods={course.foods} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(["best", "walk", "transit", "taxi"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMode(m)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              mode === m
                ? "border-amber-400 bg-amber-400 text-slate-950"
                : "border-slate-200 bg-slate-100 text-slate-400 hover:border-slate-300"
            }`}
          >
            {tc(
              m === "best"
                ? "modeBest"
                : m === "walk"
                  ? "modeWalk"
                  : m === "transit"
                    ? "modeTransit"
                    : "modeTaxi",
            )}
          </button>
        ))}
      </div>

      <ol className="mt-6 space-y-3">
        {course.stops.map((s, i) => {
          const crowd = course.info[i]?.congestion ?? null;
          const bus = course.transit[i]?.lastBus ?? null;
          return (
            <li
              key={s.contentId}
              className="rounded-xl border border-slate-200 bg-white/[0.02] px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-extrabold text-slate-950">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{s.title}</p>
                  {course.notes[i] && (
                    <p className="mt-1 text-sm text-slate-400">
                      {course.notes[i]}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {bus && (
                      <span className="text-slate-500">
                        {t("lastBus", {
                          time: `${bus.slice(0, 2)}:${bus.slice(2)}`,
                        })}
                      </span>
                    )}
                    {/* 붐빔은 거르지 않고 알려만 준다. 없는 곳은 아예 표시하지 않는다 —
                        '정보 없음'을 '한산함'으로 읽으면 안 된다 */}
                    {crowd != null && crowd >= 70 && (
                      <span className="flex items-center gap-1 font-semibold text-amber-600">
                        <AlertTriangle size={11} />
                        {t("crowded", { rate: crowd })}
                      </span>
                    )}
                    {crowd != null && crowd < 40 && (
                      <span className="text-emerald-600/80">
                        {t("quiet", { rate: crowd })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {course.tip && (
        <p className="mt-5 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-400">
          {course.tip}
        </p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        {t("crowdNote")}
      </p>

      {/* 야식 — 코스 중간 스팟 주변 식당. 영업시간은 공사 원문 그대로 보여주고
          형식이 제각각이라 "지금 여는지"는 판단하지 않는다 (방문 전 확인 안내) */}
      {course.foods?.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-700">
            <UtensilsCrossed size={15} />
            {t("foodTitle")}
          </p>
          <p className="mt-1 text-xs text-amber-700/80">{t("foodOnMap")}</p>
          <ul className="mt-3 space-y-2.5">
            {course.foods.map((f) => (
              <li key={f.contentId} className="rounded-xl bg-white px-3.5 py-3">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-bold text-slate-900">{f.title}</span>
                  <span className="text-xs text-slate-400">
                    {t("foodDistance", { m: f.distM })}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-400">{f.addr}</p>
                {f.hours && (
                  <p className="mt-1.5 text-xs font-semibold text-amber-700">
                    {t("foodHours")} {f.hours}
                  </p>
                )}
                {f.restDay && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {t("foodRestDay")} {f.restDay}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-amber-700/80">
            {t("foodNote")}
          </p>
        </div>
      )}

      {/* 내 코스 다듬기 (피드백 8·10) — 코스 화면·성향 결과와 같은 패널을 쓴다.
          고친 결과는 브라우저에 남아 새로고침해도 그대로다.

          위쪽 일정표(도착 시각·체류)는 처음 짠 순서로 계산된 값이라 여기서
          바꾼 순서를 따라가지 않는다. 다시 계산하려면 이동 시간을 서버에서
          새로 받아야 해서, 대신 편집 안내로 "지도 앱에서 한 번 더 확인"을
          붙여 둔다. */}
      <div className="mt-8 border-t border-slate-200 pt-6">
        <CourseCustomizer
          course={edited}
          baseIds={course.stops.map((st) => st.contentId)}
          pool={spots}
          onChange={(ids) => setIds(course.id, ids)}
          onReset={() => resetEdit(course.id)}
        />
      </div>
    </section>
  );
}
