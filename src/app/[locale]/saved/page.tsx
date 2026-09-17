import { getTranslations, setRequestLocale } from "next-intl/server";
import SavedSpots from "@/components/SavedSpots";
import SavedCourses from "@/components/SavedCourses";
import MyPhrases from "@/components/MyPhrases";
import PageHero, { PageBody } from "@/components/PageHero";
import { RESTAURANT_STEPS } from "@/lib/klife-restaurant";

/**
 * 찜 모아보기 — 헤더의 하트 아이콘이 여기로 온다.
 *
 * 찜한 것들이 장소는 프로필, 표현은 K-Life 하단에 흩어져 있어 "내가 담아둔
 * 것"을 한 번에 볼 수 없었다. 코스 찜을 더하면서 한 화면으로 모은다.
 * 세 목록 모두 브라우저(localStorage)에 저장돼 있어 이 페이지는 정적이고,
 * 실제 내용은 각 컴포넌트가 마운트 후 채운다.
 */
export default async function SavedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("saved");

  return (
    <>
      <PageHero
        image="/spots/hanbit-tower.jpg"
        overline="My List"
        title={t("pageTitle")}
        subtitle={t("subtitle")}
      />
      <PageBody>
        <div className="mx-auto max-w-3xl space-y-12">
          <SavedCourses />
          {/* 찜한 장소 — 프로필에 있던 것과 같은 컴포넌트 */}
          <SavedSpots mode="grid" />
          {/* 찜한 표현 — K-Life 가이드 하단과 같은 내용 */}
          <MyPhrases scenarios={[{ scenario: "restaurant", steps: RESTAURANT_STEPS }]} />
        </div>
      </PageBody>
    </>
  );
}
