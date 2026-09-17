"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  Heart,
  MapPin,
  RefreshCw,
  Route,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Course, CourseStop } from "@/lib/courses";
import type { NightSpot } from "@/lib/kto";
import {
  TYPE_CATEGORIES,
  radarValues,
  type PersonalityType,
} from "@/lib/personality-test";
import { PERSONA_MASCOT } from "@/lib/persona-mascot";
import PersonalityRadar from "./PersonalityRadar";
import CourseMap from "./CourseMap";
import CourseCustomizer from "./CourseCustomizer";
import { useCourseEdits, applyEdit } from "./useCourseEdits";
import { useSavedCourses, toSavedCourse } from "./useSavedCourses";

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

  const [spots, setSpots] = useState<NightSpot[]>([]);
  // 이 성향을 위해 사람이 짜 둔 코스 — 서버에서 구간 거리·실제 경로까지 붙여 온다
  const [personaCourse, setPersonaCourse] = useState<Course | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/personality/recos?locale=${locale}&persona=${primary}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setSpots(d.spots ?? []);
        setPersonaCourse(d.personaCourse ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locale, primary]);

  const [showDetail, setShowDetail] = useState(expanded);
  const categories = TYPE_CATEGORIES[primary];
  const mascot = PERSONA_MASCOT[primary];

  return (
    <div className="space-y-6">
      {/* 06 결과 요약 */}
      <div className="overflow-hidden rounded-3xl border border-indigo-400/25 bg-gradient-to-b from-indigo-500/10 to-slate-900/40">
        <div className="grid items-center gap-6 p-8 sm:grid-cols-[1fr_auto] sm:p-11">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
              {t("resultOverline")}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {t(`types.${primary}.name`)}
              </h2>
              <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-700">
                {t("primaryBadge")}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-indigo-700">
              {t(`types.${primary}.tagline`)}
            </p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-400">
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
          <div className="mx-8 mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:mx-11">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {t("alsoStrong")}
            </p>
            <p className="mt-1.5 text-base font-bold text-slate-900">
              {t(`types.${secondary}.name`)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {t(`types.${secondary}.desc`)}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-slate-200 bg-slate-50 px-8 py-5 sm:px-11">
          {!showDetail && (
            <button
              type="button"
              onClick={() => setShowDetail(true)}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-indigo-400"
            >
              {t("detailCta")}
              <ArrowRight size={15} />
            </button>
          )}
          {onRestart && (
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-400 transition hover:text-slate-900"
            >
              <RefreshCw size={14} />
              {t("otherTest")}
            </button>
          )}
        </div>
      </div>

      {/* 결과 바로 아래에 이 성향의 코스를 펼친다 — 예전에는 탭 안에 있거나
          코스 페이지로 넘어가야 보여서, 결과를 본 사람의 절반은 코스까지 오지
          못했다 */}
      {personaCourse && (
        <PersonaCourse
          course={personaCourse}
          spots={spots}
          primary={primary}
          t={t}
        />
      )}

      {showDetail && (
        <ResultDetail
          primary={primary}
          scores={scores}
          categories={categories}
          spots={spots}
          t={t}
          th={th}
        />
      )}
    </div>
  );
}

const fmtM = (m: number) => (m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`);

/**
 * 이 성향에 맞춰 짜 둔 코스 — 경유지·지도·다듬기를 결과 화면에서 바로 본다.
 *
 * 다듬은 결과는 코스 화면과 같은 저장소(tournight:courseEdits)에 담기므로,
 * 어디서 고치든 같은 코스로 보인다.
 */
function PersonaCourse({
  course,
  spots,
  primary,
  t,
}: {
  course: Course;
  spots: NightSpot[];
  primary: PersonalityType;
  t: ReturnType<typeof useTranslations>;
}) {
  const tc = useTranslations("courses");
  const ts = useTranslations("saved");
  const locale = useLocale();
  const { edits, setIds, reset } = useCourseEdits();
  const { courses: saved, toggle: toggleSaved } = useSavedCourses();

  const pool: CourseStop[] = useMemo(
    () =>
      spots.map((s) => ({
        contentId: s.contentId,
        title: s.title,
        addr: s.addr,
        category: s.category,
        imageUrl: s.imageUrl,
        mapX: s.mapX,
        mapY: s.mapY,
      })),
    [spots],
  );

  const view = applyEdit(course, edits[course.id], pool);
  const isSaved = saved.some((c) => c.id === course.id);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Sparkles size={17} className="text-indigo-600" />
            {t("recommendTitle")}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {tc("stopsCount", { count: view.stops.length })}
            {view.totalM > 0 ? ` · ${fmtM(view.totalM)}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            // 찜 목록에서는 "야경·분위기 감상형 코스"로 보이게 이름을 달아 둔다
            toggleSaved(
              toSavedCourse(view, "persona", locale, t(`types.${primary}.tagline`)),
            )
          }
          aria-pressed={isSaved}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${
            isSaved
              ? "bg-rose-500 text-white hover:bg-rose-600"
              : "border border-rose-300 bg-white text-rose-500 hover:bg-rose-50"
          }`}
        >
          <Heart size={15} fill={isSaved ? "currentColor" : "none"} />
          {isSaved ? ts("saved") : ts("save")}
        </button>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ol className="space-y-2">
          {view.stops.map((st, i) => (
            <li
              key={st.contentId}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-extrabold text-white">
                {i + 1}
              </span>
              {st.imageUrl && (
                <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                  <Image
                    src={st.imageUrl}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <Link
                  href={`/spots/${st.contentId}`}
                  className="block truncate text-sm font-bold text-slate-900 hover:text-indigo-600"
                >
                  {st.title}
                </Link>
                <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                  <MapPin size={10} className="shrink-0" />
                  {st.addr}
                </span>
              </span>
              {i > 0 && view.legs[i - 1] && (
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-slate-400">
                  <Route size={11} />
                  {fmtM(view.legs[i - 1].distanceM)}
                </span>
              )}
            </li>
          ))}
        </ol>
        <div className="h-72 lg:h-full lg:min-h-[320px]">
          <CourseMap course={view} mode="best" />
        </div>
      </div>

      <CourseCustomizer
        course={view}
        baseIds={course.stops.map((st) => st.contentId)}
        pool={pool}
        onChange={(ids) => setIds(course.id, ids)}
        onReset={() => reset(course.id)}
      />
    </div>
  );
}

// 07 상세 분석(레이더·키워드·강점) + 08 탭
function ResultDetail({
  primary,
  scores,
  categories,
  spots,
  t,
  th,
}: {
  primary: PersonalityType;
  scores: Record<PersonalityType, number>;
  categories: NightSpot["category"][];
  spots: NightSpot[];
  t: ReturnType<typeof useTranslations>;
  th: ReturnType<typeof useTranslations>;
}) {
  // 코스는 결과 바로 아래에서 통째로 보여주므로 탭에서는 뺐다
  type TabKey = "traits" | "spots" | "tips";
  const [tab, setTab] = useState<TabKey>("traits");
  const values = useMemo(() => radarValues(scores), [scores]);

  const keywords = t.raw(`types.${primary}.keywords`) as string[];
  const strengths = t.raw(`types.${primary}.strengths`) as string[];
  const traits = t.raw(`types.${primary}.traits`) as string[];
  const tips = t.raw(`types.${primary}.tips`) as string[];

  const recSpots = useMemo(() => {
    const match = spots.filter((s) => categories.includes(s.category));
    return (match.length ? match : spots).filter((s) => s.imageUrl).slice(0, 4);
  }, [spots, categories]);

  const TABS: { key: TabKey; Icon: typeof MapPin }[] = [
    { key: "traits", Icon: UserRound },
    { key: "spots", Icon: MapPin },
    { key: "tips", Icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {/* 07 상세 분석 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-11">
        <h3 className="text-lg font-bold text-slate-900">{t("detailTitle")}</h3>
        <p className="mt-1 text-sm text-slate-400">{t("detailSub")}</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <PersonalityRadar values={values} label={(ty) => t(`axes.${ty}`)} />
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                {t("keywordsTitle")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {keywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-indigo-500/15 px-3 py-1.5 text-xs font-bold text-indigo-700"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                {t("strengthsTitle")}
              </p>
              <ul className="mt-3 space-y-2">
                {strengths.map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-slate-400">
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
      <div className="rounded-3xl border border-slate-200 bg-white">
        <div
          role="tablist"
          className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4 sm:px-6"
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
                  ? "border-indigo-400 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-400"
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
              <p className="text-sm font-bold text-slate-900">{t("traitsHeading")}</p>
              <ul className="mt-4 space-y-2.5">
                {traits.map((s) => (
                  <li key={s} className="flex gap-2.5 text-sm text-slate-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    {s}
                  </li>
                ))}
              </ul>
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
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:border-indigo-300/40"
                    >
                      <div className="relative h-28 w-full overflow-hidden bg-slate-200">
                        {s.imageUrl && (
                          <Image
                            src={s.imageUrl}
                            alt=""
                            fill
                            sizes="(max-width:640px) 50vw, 25vw"
                            className="object-cover transition duration-500 group-hover:scale-105"
                          />
                        )}
                        <span className="absolute left-2.5 top-2.5 rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] font-bold text-indigo-700 backdrop-blur">
                          {th(`categories.${s.category}`)}
                        </span>
                      </div>
                      <p className="line-clamp-1 px-3 py-2.5 text-sm font-semibold text-slate-900">
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
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-400 transition hover:text-slate-900"
              >
                <MapPin size={15} />
                {t("seeSpots")}
              </Link>
            </div>
          )}

          {tab === "tips" && (
            <ul className="space-y-2.5">
              {tips.map((s) => (
                <li key={s} className="flex gap-2.5 text-sm text-slate-400">
                  <Sparkles size={15} className="mt-0.5 shrink-0 text-indigo-600" />
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
