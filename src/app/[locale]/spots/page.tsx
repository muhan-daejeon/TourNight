import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getVerifiedNightSpots } from "@/lib/spots";
import SpotExplorer from "@/components/SpotExplorer";
import PageHero, { PageBody } from "@/components/PageHero";

// DB의 야간 검증 스팟 기준, 1시간 주기로 재생성
export const revalidate = 3600;

/**
 * 야경명소 탭 — 검색·카테고리 필터·지도가 붙은 전체 목록.
 * 홈에는 몇 곳만 추려 보여주고, '전체 보기'가 이 페이지로 온다.
 */
export default async function SpotsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const spots = await getVerifiedNightSpots(locale);

  return (
    <>
      <PageHero
        image="/hero-night.jpg"
        overline="Tonight"
        title={t("spotsAllTitle")}
        subtitle={t("spotsAllSubtitle")}
      />
      <PageBody>
        {/* SpotExplorer가 헤더 검색이 넘긴 ?q=를 읽으므로 Suspense로 감싼다 */}
        <Suspense fallback={<div className="h-96" />}>
          <SpotExplorer spots={spots} />
        </Suspense>
      </PageBody>
    </>
  );
}
