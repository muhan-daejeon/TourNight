import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type CourseStop } from "@/lib/courses";
import { getVerifiedNightSpots } from "@/lib/spots";
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
  // 코스 다듬기에서 더할 수 있는 명소 — 코스를 만드는 재료와 같은 목록이다
  const spots = await getVerifiedNightSpots(locale);
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
          <CourseTabs spots={pool} />
        </Suspense>
      </PageBody>
    </>
  );
}
