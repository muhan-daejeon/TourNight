import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPersonaCourses, type CourseStop } from "@/lib/courses";
import { getVerifiedNightSpots } from "@/lib/spots";
import { PERSONALITY_TYPES } from "@/lib/personality-test";
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
  const [personaCourses, spots] = await Promise.all([
    // 목록에 까는 코스 — 성향별로 사람이 짜 둔 7개. 어떤 성향으로 들어올지
    // 서버는 모르므로(정적 페이지 유지) 다 만들어 두고 화면에서 고른다
    getPersonaCourses(locale),
    // 코스 다듬기에서 더할 수 있는 명소 — 코스를 만드는 재료와 같은 목록이다
    getVerifiedNightSpots(locale),
  ]);

  // 성향 순서를 고정해야 목록이 재생성 때마다 뒤바뀌지 않는다
  const courses = PERSONALITY_TYPES.map((type) => personaCourses[type]).filter(
    (c) => !!c,
  );
  const pool: CourseStop[] = spots.map((s) => ({
    contentId: s.contentId,
    title: s.title,
    addr: s.addr,
    category: s.category,
    imageUrl: s.imageUrl,
    mapX: s.mapX,
    mapY: s.mapY,
  }));

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
          <CourseTabs courses={courses} spots={pool} />
        </Suspense>
      </PageBody>
    </>
  );
}
