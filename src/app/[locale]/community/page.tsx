import { getTranslations, setRequestLocale } from "next-intl/server";
import CommunityBoard from "@/components/CommunityBoard";
import { listPosts } from "@/lib/community";
import { isStorageConfigured } from "@/lib/storage";
import { mailFrom } from "@/lib/mail";
import PageHero, { PageBody } from "@/components/PageHero";

// 글 목록을 서버에서 채워 보낸다. 브라우저가 다시 불러오지 않으므로 첫 화면부터
// 글이 보이고, API 왕복이 한 번 줄어든다.
// 새 글이 자주 올라오는 화면이라 재생성 주기는 짧게 잡는다 (작성자 본인은
// 등록 즉시 자기 글이 목록 맨 위에 붙으므로 이 주기를 기다리지 않는다).
export const revalidate = 60;

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("community");
  const posts = await listPosts();

  return (
    <>
      <PageHero
        image="/spots/jungangro-night.jpg"
        width="narrow"
        overline="Night Talk"
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <PageBody width="narrow">
        <CommunityBoard
          initialPosts={posts}
          canAttach={isStorageConfigured()}
          // 인증 메일 발신 주소 — 수신 허용 목록에 넣으라고 화면에 띄운다.
          // 중국·일본 메일함이 모르는 발신자를 잘 거르기 때문에 필요하다
          mailFrom={mailFrom()}
        />
      </PageBody>
    </>
  );
}
