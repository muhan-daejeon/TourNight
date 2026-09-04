import { getTranslations, setRequestLocale } from "next-intl/server";
import KLifeGuide from "@/components/KLifeGuide";
import PageHero, { PageBody } from "@/components/PageHero";
import { RESTAURANT_STEPS, RESTAURANT_QUIZ } from "@/lib/klife-restaurant";

/**
 * K-Life 가이드 · 식당편 — 외국인 관광객이 한국 식당에 들어가서 나올 때까지를
 * 미리 경험하는 상황 기반 가이드. 시나리오 데이터만 바꾸면 술집/택시/쇼핑으로
 * 확장한다 (개발정의서 8항).
 */
export default async function KLifeRestaurantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("klife");

  return (
    <>
      <PageHero
        image="/etiquette/dining.jpg"
        width="narrow"
        overline="K-LIFE GUIDE"
        title={t("restaurantTitle")}
        subtitle={t("restaurantSubtitle")}
      />
      <PageBody width="narrow">
        <KLifeGuide
          scenario="restaurant"
          steps={RESTAURANT_STEPS}
          quiz={RESTAURANT_QUIZ}
        />
      </PageBody>
    </>
  );
}
