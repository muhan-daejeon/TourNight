import { getTranslations, setRequestLocale } from "next-intl/server";
import { getVerifiedNightSpots } from "@/lib/spots";
import SpotExplorer from "@/components/SpotExplorer";

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
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="overline-label">Tonight</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        {t("spotsAllTitle")}
      </h1>
      <p className="mt-3 mb-8 max-w-2xl text-slate-400">
        {t("spotsAllSubtitle")}
      </p>
      <SpotExplorer spots={spots} />
    </div>
  );
}
