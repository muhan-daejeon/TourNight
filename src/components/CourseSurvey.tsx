"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Clock,
  Footprints,
  Bus,
  Car,
  LocateFixed,
  MapPin,
  Sparkles,
  Users,
  AlertTriangle,
} from "lucide-react";
import type { Course } from "@/lib/courses";
import CourseMap, { type MapMode } from "./CourseMap";

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
const THEMES = ["nature", "city", "science", "festival"] as const;

/** 서버가 돌려주는 맞춤 코스 (courses.ts SurveyCourse) */
interface SurveyCourse extends Course {
  title: string;
  summary: string;
  tip: string;
  notes: string[];
  transit: ({ nodeName: string; lastBus: string | null } | null)[];
  info: { congestion: number | null }[];
  source: "ai" | "distance";
  applied: {
    startTime: string;
    endTime: string;
    durationMin: number;
    transport: "walk" | "transit" | "taxi";
    targetStops: number;
  };
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
      : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white"
  }`;

export default function CourseSurvey() {
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
  const [themes, setThemes] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<SurveyCourse | null>(null);
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
      <div className="space-y-7 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        {/* 1. 출발지 */}
        <fieldset>
          <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
            <MapPin size={15} className="text-amber-300" />
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
          <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
            <Clock size={15} className="text-amber-300" />
            {t("q2")}
          </legend>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              aria-label={t("startTime")}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-400/60"
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
          <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
            <Bus size={15} className="text-amber-300" />
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
          <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
            <Users size={15} className="text-amber-300" />
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

        {/* 5. 테마 (복수) */}
        <fieldset>
          <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
            <Sparkles size={15} className="text-amber-300" />
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

        <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-5">
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
          <p className="rounded-xl border border-rose-400/25 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        )}
      </div>

      {course && <SurveyResult course={course} mode={mode} onMode={setMode} tc={tc} />}
    </div>
  );
}

/** 결과 — 왜 이 코스인지 근거를 함께 보여준다 */
function SurveyResult({
  course,
  mode,
  onMode,
  tc,
}: {
  course: SurveyCourse;
  mode: MapMode;
  onMode: (m: MapMode) => void;
  tc: ReturnType<typeof useTranslations>;
}) {
  const t = useTranslations("survey");
  const a = course.applied;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      {course.title && (
        <h2 className="text-xl font-bold tracking-tight">{course.title}</h2>
      )}
      {course.summary && (
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {course.summary}
        </p>
      )}

      {/* 적용된 조건 — 설문 답변이 실제 제약으로 쓰였다는 근거 */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
          {a.startTime} – {a.endTime}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
          {t(`transports.${a.transport}`)}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
          {t("stopsCount", { n: course.stops.length })}
        </span>
        {course.source === "distance" && (
          <span className="rounded-full border border-amber-400/25 bg-amber-400/[0.06] px-3 py-1.5 text-amber-200">
            {tc("aiFallbackNote")}
          </span>
        )}
      </div>

      <div className="mt-5 h-80 sm:h-[420px]">
        <CourseMap course={course} mode={mode} />
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
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25"
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
              className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-extrabold text-slate-950">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white">{s.title}</p>
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
                      <span className="flex items-center gap-1 font-semibold text-amber-300">
                        <AlertTriangle size={11} />
                        {t("crowded", { rate: crowd })}
                      </span>
                    )}
                    {crowd != null && crowd < 40 && (
                      <span className="text-emerald-300/80">
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
        <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          {course.tip}
        </p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        {t("crowdNote")}
      </p>
    </section>
  );
}
