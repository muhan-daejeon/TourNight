import { getTranslations, setRequestLocale } from "next-intl/server";
import NightBikeMap from "@/components/NightBikeMap";
import PageHero, { PageBody } from "@/components/PageHero";

// 실시간 대여소 현황이라 캐시된 정적 페이지로 두면 안 된다
export const dynamic = "force-dynamic";

export default async function NightBikePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nightBike");

  return (
    <>
      <PageHero
        image="/spots/hanbat-arboretum.jpg"
        overline={t("overline")}
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <PageBody>
        <NightBikeMap />
      </PageBody>
    </>
  );
}
