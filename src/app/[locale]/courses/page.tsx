import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCourses, getPersonaCourses } from "@/lib/courses";
import CourseTabs from "@/components/CourseTabs";
import PageHero, { PageBody } from "@/components/PageHero";

// 검증 스팟 기준으로 코스 생성 — 1시간 주기 재생성
export const revalidate = 3600;

export default async function CoursesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("courses");
  const [courses, personaCourses] = await Promise.all([
    getCourses(locale),
    // 성향 결과의 "추천 코스 보기"(?persona=)가 골라 볼 수제 코스들.
    // 어떤 성향으로 들어올지 서버는 모르므로(정적 페이지 유지) 7종을 다 만든다
    getPersonaCourses(locale),
  ]);

  return (
    <>
      <PageHero
        image="/spots/expo-bridge.jpg"
        overline="Night Drive"
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <PageBody>
        {/* CourseExplorer가 ?from=<contentId>(코스 짜기 진입)를 읽으므로 Suspense로 감싼다 */}
        <Suspense fallback={<div className="h-96" />}>
          <CourseTabs courses={courses} personaCourses={personaCourses} />
        </Suspense>
      </PageBody>
    </>
  );
}
