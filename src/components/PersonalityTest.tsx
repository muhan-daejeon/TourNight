"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  BarChart3,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  ImageIcon,
  ListChecks,
  MapPin,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Course } from "@/lib/courses";
import type { NightSpot } from "@/lib/kto";
import {
  OPTION_KEYS,
  QUESTIONS,
  QUESTION_TIMES,
  TYPE_CATEGORIES,
  radarValues,
  scorePersonality,
  type OptionKey,
  type PersonalityType,
} from "@/lib/personality-test";
import { PERSONA_INTRO_IMAGE, PERSONA_QUESTION_IMAGES } from "@/lib/persona-images";
import PersonalityRadar from "./PersonalityRadar";

type Phase = "intro" | "quiz" | "analyzing" | "result";

/**
 * 야간관광 여행성향 시뮬레이션 테스트 (기획 목업 전체 흐름).
 *
 * 소개 → 12문항 → 분석 중 → 결과 요약 → (자세히 보기) 상세 분석·탭.
 * 채점은 lib/personality-test, 결과의 추천 코스·스팟은 서버에서 받아 넘긴다.
 * 마스코트·선택지 일러스트는 아직 에셋이 없어 아이콘·그라데이션 자리표시자로
 * 두었다 — 이미지가 준비되면 그 자리만 교체하면 된다.
 */
export default function PersonalityTest() {
  const t = useTranslations("personality");
  const th = useTranslations("home"); // 카테고리 라벨 재사용
  const locale = useLocale();
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});

  // 추천 코스·스팟은 KTO 실시간 조회라 결과에서만 필요하다. 테스트를 푸는 동안
  // 백그라운드로 미리 받아 둬, 결과에 도달할 즈음엔 준비돼 있게 한다.
  const [courses, setCourses] = useState<Course[]>([]);
  const [spots, setSpots] = useState<NightSpot[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/personality/recos?locale=${locale}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setCourses(d.courses ?? []);
        setSpots(d.spots ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const result = useMemo(
    () => (phase === "result" ? scorePersonality(answers) : null),
    [phase, answers],
  );

  function restart() {
    setAnswers({});
    setIndex(0);
    setPhase("intro");
  }

  // ── 인트로(테스트 소개) ────────────────────────────────────
  if (phase === "intro") {
    const HOW: { key: string; Icon: typeof ListChecks }[] = [
      { key: "how1", Icon: ListChecks },
      { key: "how2", Icon: BarChart3 },
      { key: "how3", Icon: UserRound },
      { key: "how4", Icon: Camera },
    ];
    return (
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50">
        <div className="grid gap-8 p-8 sm:grid-cols-[1.4fr_1fr] sm:p-11">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              {t("introTitle")}
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
              {t("introBody")}
            </p>
            <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {HOW.map(({ key, Icon }, i) => (
                <div key={key}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                    <Icon size={20} />
                  </div>
                  <p className="mt-3 text-[13px] font-bold text-white">
                    {i + 1}. {t(`${key}.title`)}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">
                    {t(`${key}.body`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/25 via-purple-700/20 to-slate-900">
            {PERSONA_INTRO_IMAGE ? (
              <Image
                src={PERSONA_INTRO_IMAGE}
                alt=""
                fill
                sizes="(min-width: 640px) 40vw, 100vw"
                className="object-cover"
              />
            ) : (
              <>
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_40%,rgba(165,180,252,0.35),transparent_70%)]" />
                <Sparkles size={48} className="relative text-indigo-200/80" />
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-slate-950/40 px-8 py-5 sm:px-11">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
            <ListChecks size={13} /> {t("metaCount", { count: QUESTIONS.length })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
            <Clock size={13} /> {t("metaTime")}
          </span>
          <button
            type="button"
            onClick={() => setPhase("quiz")}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-indigo-500 px-7 py-3 text-sm font-bold text-white shadow-[0_0_28px_rgba(99,102,241,0.4)] transition hover:bg-indigo-400"
          >
            {t("start")}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── 분석 중 ────────────────────────────────────────────────
  if (phase === "analyzing") {
    return <Analyzing t={t} onDone={() => setPhase("result")} />;
  }

  // ── 결과 ───────────────────────────────────────────────────
  if (phase === "result" && result) {
    return (
      <Result
        primary={result.primary}
        secondary={result.secondary}
        scores={result.scores}
        courses={courses}
        spots={spots}
        t={t}
        th={th}
        onRestart={restart}
      />
    );
  }

  // ── 문항 ───────────────────────────────────────────────────
  const q = QUESTIONS[index];
  const selected = answers[q.id];
  const progress = ((index + 1) / QUESTIONS.length) * 100;
  const isLast = index === QUESTIONS.length - 1;
  // q.id는 "q1".."q12" — 사진은 앞의 몇 문항만 있고(persona:images 스크립트로
  // 생성), 없는 문항은 기존 아이콘 자리표시자로 자연히 대체된다
  const qOptionImages = PERSONA_QUESTION_IMAGES[q.id.replace(/^q/, "")];

  const goNext = () => {
    if (!selected) return;
    if (isLast) setPhase("analyzing");
    else setIndex(index + 1);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50">
      {/* 진행바 + 시간 배지 */}
      <div className="border-b border-white/10 px-6 py-5 sm:px-9">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold">
          <span className="tabular-nums text-slate-300">
            {String(index + 1).padStart(2, "0")} / {QUESTIONS.length}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-2.5 py-1 text-indigo-200">
            <Clock size={12} />
            {QUESTION_TIMES[index]}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="p-6 sm:p-9">
        <h2 className="text-lg font-bold leading-snug text-white sm:text-xl">
          {t(`questions.${q.id}.text`)}
        </h2>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {OPTION_KEYS.map((key) => {
            const on = selected === key;
            const optionImage = qOptionImages?.[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setAnswers((p) => ({ ...p, [q.id]: key }))}
                className={`group overflow-hidden rounded-2xl border text-left transition ${
                  on
                    ? "border-indigo-400 bg-indigo-500/10"
                    : "border-white/10 bg-slate-950/40 hover:border-indigo-300/50"
                }`}
              >
                <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                  {optionImage ? (
                    <Image
                      src={optionImage}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 25vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <ImageIcon size={22} className="text-slate-600" />
                  )}
                  <span
                    className={`absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold uppercase ${
                      on ? "bg-indigo-500 text-white" : "bg-slate-950/70 text-slate-300"
                    }`}
                  >
                    {key}
                  </span>
                </div>
                <p className="px-4 py-3 text-sm leading-relaxed text-slate-200">
                  {t(`questions.${q.id}.${key}`)}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-7 flex items-center gap-3">
          <button
            type="button"
            onClick={() => (index > 0 ? setIndex(index - 1) : setPhase("intro"))}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            <ChevronLeft size={15} />
            {t("prev")}
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!selected}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-indigo-500 px-7 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLast ? t("seeResult") : t("next")}
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// 분석 중 — 0→100% 진행 후 결과로
function Analyzing({
  t,
  onDone,
}: {
  t: ReturnType<typeof useTranslations>;
  onDone: () => void;
}) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const started = performance.now();
    const DURATION = 1800;
    let raf = 0;
    const tick = () => {
      const p = Math.min(100, ((performance.now() - started) / DURATION) * 100);
      setPct(Math.round(p));
      if (p < 100) raf = requestAnimationFrame(tick);
      else setTimeout(onDone, 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-10 text-center sm:p-16">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
        <Sparkles size={30} className="animate-pulse" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-white">{t("analyzingTitle")}</h2>
      <p className="mt-2 text-sm text-slate-400">{t("analyzingBody")}</p>
      <div className="mx-auto mt-8 h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-sm font-bold tabular-nums text-indigo-300">
        {t("analyzingProgress", { pct })}
      </p>
    </div>
  );
}

// 결과 — 요약(06) → 자세히 보기 → 상세 분석(07) + 탭(08)
function Result({
  primary,
  secondary,
  scores,
  courses,
  spots,
  t,
  th,
  onRestart,
}: {
  primary: PersonalityType;
  secondary: PersonalityType | null;
  scores: Record<PersonalityType, number>;
  courses: Course[];
  spots: NightSpot[];
  t: ReturnType<typeof useTranslations>;
  th: ReturnType<typeof useTranslations>;
  onRestart: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const categories = TYPE_CATEGORIES[primary];

  return (
    <div className="space-y-6">
      {/* 06 결과 요약 */}
      <div className="overflow-hidden rounded-3xl border border-indigo-400/25 bg-gradient-to-b from-indigo-500/10 to-slate-900/40">
        <div className="grid items-center gap-6 p-8 sm:grid-cols-[1fr_auto] sm:p-11">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
              {t("resultOverline")}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {t(`types.${primary}.name`)}
              </h2>
              <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-200">
                {t("primaryBadge")}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-indigo-200">
              {t(`types.${primary}.tagline`)}
            </p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300">
              {t(`types.${primary}.desc`)}
            </p>
          </div>
          {/* 마스코트 자리표시자 */}
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center justify-self-center rounded-full bg-gradient-to-br from-indigo-600/30 to-purple-700/20 sm:h-40 sm:w-40">
            <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(165,180,252,0.4),transparent_70%)]" />
            <UserRound size={52} className="relative text-indigo-100/80" />
          </div>
        </div>

        {secondary && (
          <div className="mx-8 mb-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:mx-11">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {t("alsoStrong")}
            </p>
            <p className="mt-1.5 text-base font-bold text-white">
              {t(`types.${secondary}.name`)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {t(`types.${secondary}.desc`)}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-white/10 bg-slate-950/40 px-8 py-5 sm:px-11">
          {!showDetail && (
            <button
              type="button"
              onClick={() => setShowDetail(true)}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-400"
            >
              {t("detailCta")}
              <ArrowRight size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            <RefreshCw size={14} />
            {t("otherTest")}
          </button>
        </div>
      </div>

      {showDetail && (
        <Detail
          primary={primary}
          scores={scores}
          categories={categories}
          courses={courses}
          spots={spots}
          t={t}
          th={th}
        />
      )}
    </div>
  );
}

// 07 상세 분석(레이더·키워드·강점) + 08 탭
function Detail({
  primary,
  scores,
  categories,
  courses,
  spots,
  t,
  th,
}: {
  primary: PersonalityType;
  scores: Record<PersonalityType, number>;
  categories: NightSpot["category"][];
  courses: Course[];
  spots: NightSpot[];
  t: ReturnType<typeof useTranslations>;
  th: ReturnType<typeof useTranslations>;
}) {
  type TabKey = "traits" | "courses" | "spots" | "tips";
  const [tab, setTab] = useState<TabKey>("traits");
  const values = useMemo(() => radarValues(scores), [scores]);

  const keywords = t.raw(`types.${primary}.keywords`) as string[];
  const strengths = t.raw(`types.${primary}.strengths`) as string[];
  const traits = t.raw(`types.${primary}.traits`) as string[];
  const tips = t.raw(`types.${primary}.tips`) as string[];

  const recCourses = useMemo(() => {
    const match = courses.filter((c) =>
      c.stops.some((s) => categories.includes(s.category)),
    );
    return (match.length ? match : courses).slice(0, 3);
  }, [courses, categories]);

  const recSpots = useMemo(() => {
    const match = spots.filter((s) => categories.includes(s.category));
    return (match.length ? match : spots).filter((s) => s.imageUrl).slice(0, 4);
  }, [spots, categories]);

  const TABS: { key: TabKey; Icon: typeof Compass }[] = [
    { key: "traits", Icon: UserRound },
    { key: "courses", Icon: Compass },
    { key: "spots", Icon: MapPin },
    { key: "tips", Icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {/* 07 상세 분석 */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 sm:p-11">
        <h3 className="text-lg font-bold text-white">{t("detailTitle")}</h3>
        <p className="mt-1 text-sm text-slate-400">{t("detailSub")}</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <PersonalityRadar values={values} label={(ty) => t(`axes.${ty}`)} />
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-300">
                {t("keywordsTitle")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {keywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-indigo-500/15 px-3 py-1.5 text-xs font-bold text-indigo-200"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-300">
                {t("strengthsTitle")}
              </p>
              <ul className="mt-3 space-y-2">
                {strengths.map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-slate-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 08 탭 상세 */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/50">
        <div
          role="tablist"
          className="flex gap-1 overflow-x-auto border-b border-white/10 px-4 sm:px-6"
        >
          {TABS.map(({ key, Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3.5 text-sm font-semibold transition ${
                tab === key
                  ? "border-indigo-400 text-indigo-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon size={15} />
              {t(`tabs.${key}`)}
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-8">
          {tab === "traits" && (
            <div>
              <p className="text-sm font-bold text-white">{t("traitsHeading")}</p>
              <ul className="mt-4 space-y-2.5">
                {traits.map((s) => (
                  <li key={s} className="flex gap-2.5 text-sm text-slate-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "courses" && (
            <div>
              {recCourses.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {recCourses.map((c) => (
                    <CourseCard key={c.id} course={c} th={th} labelStops={t} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">{t("noCourses")}</p>
              )}
              <Link
                href="/courses"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-400"
              >
                {t("matchedCourseCta")}
                <ArrowRight size={15} />
              </Link>
            </div>
          )}

          {tab === "spots" && (
            <div>
              {recSpots.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {recSpots.map((s) => (
                    <Link
                      key={s.contentId}
                      href={`/spots/${s.contentId}`}
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 transition hover:border-indigo-300/40"
                    >
                      <div className="relative h-28 w-full overflow-hidden bg-slate-800">
                        {s.imageUrl && (
                          <Image
                            src={s.imageUrl}
                            alt=""
                            fill
                            sizes="(max-width:640px) 50vw, 25vw"
                            className="object-cover transition duration-500 group-hover:scale-105"
                          />
                        )}
                        <span className="absolute left-2.5 top-2.5 rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] font-bold text-indigo-200 backdrop-blur">
                          {th(`categories.${s.category}`)}
                        </span>
                      </div>
                      <p className="line-clamp-1 px-3 py-2.5 text-sm font-semibold text-white">
                        {s.title}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">{t("noSpots")}</p>
              )}
              <Link
                href="/spots"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-slate-200 transition hover:text-white"
              >
                <MapPin size={15} />
                {t("seeSpots")}
              </Link>
            </div>
          )}

          {tab === "tips" && (
            <ul className="space-y-2.5">
              {tips.map((s) => (
                <li key={s} className="flex gap-2.5 text-sm text-slate-300">
                  <Sparkles size={15} className="mt-0.5 shrink-0 text-indigo-300" />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// 추천 코스 카드
function CourseCard({
  course,
  th,
  labelStops,
}: {
  course: Course;
  th: ReturnType<typeof useTranslations>;
  labelStops: ReturnType<typeof useTranslations>;
}) {
  const cover = course.stops.find((s) => s.imageUrl)?.imageUrl ?? null;
  const cats = [...new Set(course.stops.map((s) => s.category))].slice(0, 2);
  return (
    <Link
      href="/courses"
      className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 transition hover:border-indigo-300/40"
    >
      <div className="relative h-32 w-full overflow-hidden bg-slate-800">
        {cover && (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          {cats.map((c) => (
            <span
              key={c}
              className="rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] font-bold text-indigo-200 backdrop-blur"
            >
              {th(`categories.${c}`)}
            </span>
          ))}
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold text-indigo-300">
          {labelStops("stopsCount", { count: course.stops.length })}
        </p>
        <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-white">
          {course.stops.map((s) => s.title).join(" → ")}
        </p>
      </div>
    </Link>
  );
}
