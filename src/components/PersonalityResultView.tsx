"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  Compass,
  MapPin,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Course } from "@/lib/courses";
import type { NightSpot } from "@/lib/kto";
import {
  TYPE_CATEGORIES,
  radarValues,
  type PersonalityType,
} from "@/lib/personality-test";
import { PERSONA_MASCOT } from "@/lib/persona-mascot";
import PersonalityRadar from "./PersonalityRadar";

/**
 * 성향 테스트 결과 화면 (요약 + 상세 분석 + 탭).
 *
 * PersonalityTest.tsx(테스트를 막 끝낸 직후)와 프로필의 "내 여행 성향
 * 확인하기" 팝업(예전 결과를 다시 봄) 양쪽에서 그대로 쓴다 — 두 곳이 보여줄
 * 내용이 완전히 같아서(당신의 야간 여행 성향/성향 상세 분석/특징·코스·스팟·팁)
 * 따로 두면 반드시 어긋난다. 추천 코스·스팟은 여기서 직접 받아온다 — 두 진입점
 * 모두 필요해 상위에서 내려줄 이유가 없다.
 */
export default function PersonalityResultView({
  primary,
  secondary,
  scores,
  expanded = false,
  onRestart,
}: {
  primary: PersonalityType;
  secondary: PersonalityType | null;
  scores: Record<PersonalityType, number>;
  /** true면 "결과 자세히 보기"를 누르지 않아도 상세 분석까지 처음부터 다 보여준다 */
  expanded?: boolean;
  /** 있으면 "다른 테스트 해보기" 버튼을 보여준다 (프로필 팝업에는 없다) */
  onRestart?: () => void;
}) {
  const t = useTranslations("personality");
  const th = useTranslations("home"); // 카테고리 라벨 재사용
  const locale = useLocale();

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

  const [showDetail, setShowDetail] = useState(expanded);
  const categories = TYPE_CATEGORIES[primary];
  const mascot = PERSONA_MASCOT[primary];

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
          {/* 마스코트 */}
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center justify-self-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-600/30 to-purple-700/20 sm:h-40 sm:w-40">
            {mascot ? (
              <Image
                src={mascot.image}
                alt={mascot.name}
                fill
                sizes="160px"
                className="object-contain p-2"
              />
            ) : (
              <>
                <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(165,180,252,0.4),transparent_70%)]" />
                <UserRound size={52} className="relative text-indigo-100/80" />
              </>
            )}
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
          {onRestart && (
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-slate-300 transition hover:text-white"
            >
              <RefreshCw size={14} />
              {t("otherTest")}
            </button>
          )}
        </div>
      </div>

      {showDetail && (
        <ResultDetail
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
function ResultDetail({
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
  // 'n곳' 표기는 코스 화면과 같은 문구를 쓴다 (personality에는 없는 키다)
  const tc = useTranslations("courses");
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
              type="button"
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
                    <CourseCard key={c.id} course={c} th={th} labelStops={tc} />
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
