"use client";

import { useSearchParams } from "next/navigation";
import type { Course } from "@/lib/courses";
import CourseExplorer from "./CourseExplorer";
import CourseSurvey from "./CourseSurvey";

/**
 * 코스 만들기 — AI 코스 만들기(맞춤코스)가 본체다.
 * 성향 테스트는 전용 페이지(/personality)가 따로 있어 여기서는 겹쳐 두지
 * 않는다 (팀 피드백). 테스트 결과의 "추천 코스 보기"가 이 페이지로 이어진다.
 *
 * 지도에서 "코스 만들기"로 들어온 경우(?from=명소id)는 그 명소를 거치는
 * 기존 추천/AI 코스 흐름(CourseExplorer)을 보여준다.
 */
export default function CourseTabs({ courses }: { courses: Course[] }) {
  const fromParam = useSearchParams().get("from");

  if (fromParam) {
    return <CourseExplorer courses={courses} />;
  }
  return <CourseSurvey />;
}
