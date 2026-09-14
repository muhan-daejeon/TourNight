import { setRequestLocale } from "next-intl/server";
import PageHero, { PageBody } from "@/components/PageHero";
import NoticeBoard from "@/components/NoticeBoard";

/** 공지사항 — 대전시·투어나잇 소식 전체 목록(분류·검색·페이지네이션·아코디언) */
export default async function NoticesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHero
        image="/hero-night.jpg"
        overline="NOTICES"
        title="공지사항"
        subtitle="대전과 투어나잇의 소식을 한 곳에서 확인하세요."
      />
      <PageBody width="narrow">
        <NoticeBoard />
      </PageBody>
    </>
  );
}
