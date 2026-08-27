import LocalSpotPage from "@/components/LocalSpotPage";

// 한국관광공사 실시간 목록 — 1시간 주기 재생성
export const revalidate = 3600;

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <LocalSpotPage kind="stay" locale={locale} />;
}
