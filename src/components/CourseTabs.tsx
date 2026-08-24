"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ListChecks, Sparkles } from "lucide-react";
import type { Course } from "@/lib/courses";
import CourseExplorer from "./CourseExplorer";
import CourseSurvey from "./CourseSurvey";

type Tab = "preset" | "survey";

/**
 * 추천 코스 페이지의 두 갈래.
 *
 * - 추천 코스: 미리 만들어 둔 코스 + 지도에서 담아 만드는 AI 코스 (기존)
 * - 맞춤 코스: 설문에 답하면 그 조건 안에서 새로 짜 주는 코스
 *
 * 탭을 바꿔도 상대 탭은 언마운트하지 않는다. 설문을 채워 코스를 받아둔 뒤
 * 추천 코스를 잠깐 보고 돌아왔을 때 답변이 날아가면 다시 채워야 한다.
 */
export default function CourseTabs({ courses }: { courses: Course[] }) {
  const t = useTranslations("courses");
  const [tab, setTab] = useState<Tab>("preset");
  // 설문 탭을 한 번이라도 열었을 때만 만든다 (첫 진입에서 위치 권한을 묻지 않도록)
  const [surveyOpened, setSurveyOpened] = useState(false);

  const TABS = [
    { key: "preset" as const, label: t("tabPreset"), Icon: ListChecks },
    { key: "survey" as const, label: t("tabSurvey"), Icon: Sparkles },
  ];

  return (
    <div>
      <div
        data-tour="courses"
        role="tablist"
        aria-label={t("title")}
        className="mb-7 flex gap-2 border-b border-white/[0.08]"
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
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div hidden={tab !== "preset"}>
        <CourseExplorer courses={courses} />
      </div>
      {surveyOpened && (
        <div hidden={tab !== "survey"}>
          <CourseSurvey />
        </div>
      )}
    </div>
  );
}
