"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Landmark, Sparkles } from "lucide-react";
import type { Course } from "@/lib/courses";
import CourseExplorer from "./CourseExplorer";
import CourseSurvey from "./CourseSurvey";
import PersonalityTest from "./PersonalityTest";

type Tab = "persona" | "survey";

/**
 * 코스 만들기 — [성향 테스트 | AI] 두 갈래 (피드백 10).
 *
 * - 성향 테스트: 12문항 테스트를 여기서 바로 진행하고, 결과 화면의
 *   "추천 코스 보기"를 누르면 AI(맞춤코스) 탭으로 이어진다.
 * - AI: 위치·시간·동행 설문으로 코스를 새로 짜 주는 기존 맞춤코스.
 *
 * 지도에서 "코스 만들기"로 들어온 경우(?from=명소id)는 그 명소를 거치는
 * AI 코스 흐름(CourseExplorer)이 우선이다 — 탭 대신 그 화면을 보여준다.
 *
 * 탭을 바꿔도 상대 탭은 언마운트하지 않는다. 설문을 채워 코스를 받아둔 뒤
 * 성향 탭을 잠깐 보고 돌아왔을 때 답변이 날아가면 다시 채워야 한다.
 */
export default function CourseTabs({ courses }: { courses: Course[] }) {
  const t = useTranslations("courses");
  const fromParam = useSearchParams().get("from");
  const [tab, setTab] = useState<Tab>("persona");
  // 설문 탭을 한 번이라도 열었을 때만 만든다 (첫 진입에서 위치 권한을 묻지 않도록)
  const [surveyOpened, setSurveyOpened] = useState(false);

  // 지도에서 명소를 담아 들어온 흐름 — 기존 추천/AI 코스 화면 그대로
  if (fromParam) {
    return <CourseExplorer courses={courses} />;
  }

  const TABS = [
    { key: "persona" as const, label: t("tabPersona"), Icon: Landmark },
    { key: "survey" as const, label: t("tabAi"), Icon: Sparkles },
  ];

  const openSurvey = () => {
    setSurveyOpened(true);
    setTab("survey");
    // 탭 머리로 시선 이동 — 결과 화면 하단 버튼에서 넘어올 때 대비
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <div
        data-tour="courses"
        role="tablist"
        aria-label={t("title")}
        className="mb-7 flex gap-2 border-b border-slate-200"
      >
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              if (key === "survey") setSurveyOpened(true);
            }}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              tab === key
                ? "border-daejeon-blue text-daejeon-blue"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div hidden={tab !== "persona"}>
        <PersonalityTest onSeeCourses={openSurvey} />
      </div>
      {surveyOpened && (
        <div hidden={tab !== "survey"}>
          <CourseSurvey />
        </div>
      )}
    </div>
  );
}
