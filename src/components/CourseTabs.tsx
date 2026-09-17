"use client";

import { useSearchParams } from "next/navigation";
import type { Course } from "@/lib/courses";
import type { PersonalityType } from "@/lib/personality-test";
import CourseExplorer from "./CourseExplorer";
import CourseSurvey from "./CourseSurvey";

/**
 * 코스 만들기 — AI 코스 만들기(맞춤코스)가 본체다.
 * 성향 테스트는 전용 페이지(/personality)가 따로 있어 여기서는 겹쳐 두지
 * 않는다 (팀 피드백).
 *
 * 추천 코스 화면(CourseExplorer)으로 빠지는 경우:
 * - 지도의 "코스 만들기"(?from=<contentId>)
 * - 성향 결과의 "추천 코스 보기"(?persona=<type>&course=persona-<type>)
 *   — 그 성향의 수제 코스를 목록 맨 앞에 붙이고, ?course=가 그걸 골라
 *   지도·경유지를 바로 펼친다
 */
export default function CourseTabs({
  courses,
  personaCourses = {},
}: {
  courses: Course[];
  personaCourses?: Partial<Record<PersonalityType, Course>>;
}) {
  const params = useSearchParams();
  const fromParam = params.get("from");
  const personaParam = params.get("persona");
  const courseParam = params.get("course");

  const personaCourse = personaParam
    ? personaCourses[personaParam as PersonalityType]
    : undefined;

  if (fromParam || courseParam || personaCourse) {
    const list = personaCourse ? [personaCourse, ...courses] : courses;
    return <CourseExplorer courses={list} />;
  }
  return <CourseSurvey />;
}
