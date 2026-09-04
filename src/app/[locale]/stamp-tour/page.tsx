import { getTranslations, setRequestLocale } from "next-intl/server";
import StampTour from "@/components/StampTour";
import PageHero, { PageBody } from "@/components/PageHero";

// 로그인해야 들어올 수 있는 화면(middleware가 이미 막는다) — 계정별로 고른
// 장소·도장 사진이 남으므로 서버에서 매번 새로 그린다
export const dynamic = "force-dynamic";

export default async function StampTourPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("stampTour");

  return (
    <>
      {/* 페이지 배너는 소개 문구로 고정해 둔다 — "선택한 관광지에서…" 본문구는
          장소를 고른 뒤에만 뜻이 통해서, 그건 StampTour 안(본문 상단)에서
          단계에 맞게 띄운다 */}
      <PageHero
        image="/spots/expo-bridge.jpg"
        overline={t("overline")}
        title={t("introTitle")}
        subtitle={t("introSubtitle")}
      />
      <PageBody>
        <StampTour />
      </PageBody>
    </>
  );
}
