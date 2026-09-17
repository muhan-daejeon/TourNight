import { getTranslations, setRequestLocale } from "next-intl/server";
import SavedSpots from "@/components/SavedSpots";
import SavedCourses from "@/components/SavedCourses";
import PageHero, { PageBody } from "@/components/PageHero";

/**
 * 찜 모아보기 — 헤더의 하트 아이콘이 여기로 온다.
 *
 * 찜한 코스와 장소를 한 화면에 모은다 — 장소는 프로필에만 있었고 코스는
 * 아예 찜할 수 없었다. 두 목록 모두 브라우저(localStorage)에 저장돼 있어
 * 이 페이지는 정적이고, 실제 내용은 각 컴포넌트가 마운트 후 채운다.
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
        </div>
      </PageBody>
    </>
  );
}
