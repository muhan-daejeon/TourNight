import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCourses } from "@/lib/courses";
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
  const courses = await getCourses(locale);

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
          <CourseTabs courses={courses} />
        </Suspense>
      </PageBody>
    </>
  );
}
