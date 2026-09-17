"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Course, CourseStop } from "@/lib/courses";
import { PERSONALITY_TYPES, type PersonalityType } from "@/lib/personality-test";
import CourseExplorer from "./CourseExplorer";
import CourseSurvey from "./CourseSurvey";

const isType = (v: unknown): v is PersonalityType =>
  typeof v === "string" && (PERSONALITY_TYPES as readonly string[]).includes(v);

/**
 * 코스 만들기 — AI 코스 만들기(맞춤코스)가 본체다.
 * 성향 테스트는 전용 페이지(/personality)가 따로 있어 여기서는 겹쳐 두지
 * 않는다 (팀 피드백).
 *
 * 추천 코스 화면(CourseExplorer)으로 빠지는 경우:
 * - 지도의 "코스 만들기"(?from=<contentId>)
 * - 성향 결과의 "추천 코스 보기"(?persona=<type>&course=persona-<type>)
 *
 * 목록에 까는 코스는 성향별로 사람이 짜 둔 것인데, 7개를 다 늘어놓지 않고
 * "내 성향" 하나만 보여준다. 나머지 여섯은 어차피 내 취향이 아니고, 다 깔면
 * 뭘 봐야 하는지가 흐려진다. 내 성향은 ?persona=로 넘어오거나, 없으면
 * 지난 테스트 결과(/api/personality/latest)에서 읽는다.
 *
 * 예전에는 명소를 좌표로 묶어 자동 생성한 5개를 깔았는데, 어떤 기준으로
 * 묶였는지가 화면에서 읽히지 않아 "그냥 가까운 곳 다섯 개"로만 보였다.
 */
export default function CourseTabs({
  courses,
  spots = [],
}: {
  courses: Course[];
  /** 코스 다듬기에서 더할 수 있는 명소 전체 */
  spots?: CourseStop[];
}) {
  const t = useTranslations("courses");
  const params = useSearchParams();
  const fromParam = params.get("from");
  const personaParam = params.get("persona");
  const courseParam = params.get("course");

  // undefined = 아직 확인 중, null = 테스트 기록 없음
  const [myType, setMyType] = useState<PersonalityType | null | undefined>(
    undefined,
  );
  useEffect(() => {
    // URL이 성향을 이미 알려줬으면 굳이 물어보지 않는다
    if (personaParam) return;
    const ac = new AbortController();
    fetch("/api/personality/latest", { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMyType(isType(d?.result?.primary) ? d.result.primary : null))
      .catch(() => {
        if (!ac.signal.aborted) setMyType(null);
      });
    return () => ac.abort();
  }, [personaParam]);

  if (!fromParam && !courseParam && !personaParam) return <CourseSurvey />;

  const mine = personaParam ?? (myType === undefined ? null : myType);
  const list = mine ? courses.filter((c) => c.id === `persona-${mine}`) : [];

  // 성향을 모르는 동안에는 코스 자리를 비워 두기보다 확인 중임을 알린다.
  // (?from=로 들어왔으면 AI 코스를 먼저 보여줘야 하니 기다리지 않는다)
  if (!fromParam && !personaParam && myType === undefined) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
        <Loader2 size={15} className="animate-spin" />
        {t("personaLoading")}
      </p>
    );
  }

  return (
    <>
      {/* 테스트를 아직 안 봤으면 내 성향 코스를 고를 수 없다 — 바로 보내 준다 */}
      {!mine && myType === null && (
        <div className="mb-4 rounded-2xl border border-daejeon-blue/30 bg-daejeon-blue/6 p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
            <Sparkles size={15} className="text-daejeon-blue" />
            {t("personaNeededTitle")}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
            {t("personaNeededBody")}
          </p>
          <Link
            href="/personality"
            className="mt-3 inline-flex rounded-full bg-daejeon-blue px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
          >
            {t("personaNeededCta")}
          </Link>
        </div>
      )}
      {(fromParam || list.length > 0) && (
        <CourseExplorer courses={list} spots={spots} />
      )}
    </>
  );
}
