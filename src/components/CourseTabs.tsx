"use client";

import { useSearchParams } from "next/navigation";
import type { CourseStop } from "@/lib/courses";
import CourseExplorer from "./CourseExplorer";
import CourseSurvey from "./CourseSurvey";

/**
 * 코스 만들기 — 설문으로 짜는 맞춤 코스(CourseSurvey)가 본체다.
 *
 * 명소 지도에서 "코스 만들기"(?from=<contentId>)로 넘어오면 그 명소를 거치는
 * AI 코스 화면(CourseExplorer)으로 빠진다.
 *
 * 성향별 수제 코스는 성향 결과 화면에서 바로 펼쳐 보여주므로 여기 목록에는
 * 두지 않는다. 좌표로 묶어 자동 생성하던 코스 5개도 뺐다 — 어떤 기준으로
 * 묶였는지가 화면에서 읽히지 않아 "그냥 가까운 곳 다섯 개"로만 보였다.
 */
export default function CourseTabs({
  spots = [],
}: {
  /** 코스 다듬기에서 더할 수 있는 명소 전체 */
  spots?: CourseStop[];
}) {
  const fromParam = useSearchParams().get("from");

  if (fromParam) return <CourseExplorer spots={spots} />;
  return <CourseSurvey spots={spots} />;
}
