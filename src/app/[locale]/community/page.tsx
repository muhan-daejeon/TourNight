import { getTranslations, setRequestLocale } from "next-intl/server";
import CommunityBoard from "@/components/CommunityBoard";
import { listPosts } from "@/lib/community";
import { isStorageConfigured } from "@/lib/storage";
import { mailFrom } from "@/lib/mail";
import { getActiveSessionUser } from "@/lib/session";
import { isEmailVerified } from "@/lib/users";
import PageHero, { PageBody } from "@/components/PageHero";

// 글 목록을 서버에서 채워 보낸다. 브라우저가 다시 불러오지 않으므로 첫 화면부터
// 글이 보이고, API 왕복이 한 번 줄어든다.
//
// 누가 보고 있는지도 서버에서 읽는다. 예전에는 브라우저가 /api/auth/me로 따로
// 물어봤는데, 그 답이 오기까지 800ms 동안 글쓰기 영역이 비어 있다가 뒤늦게
// 끼어들어 목록을 아래로 밀었다. 쿠키를 읽으므로 이 페이지는 요청마다 그려진다 —
// 어차피 로그인해야 들어올 수 있는 화면이라 미리 만들어 둘 이득이 크지 않다.
// 대신 글 목록 조회는 따로 캐시해(listPosts) DB를 매번 두드리지 않는다.

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("community");
  const session = await getActiveSessionUser();
  const [posts, verified] = await Promise.all([
    listPosts(),
    session ? isEmailVerified(session.userId) : Promise.resolve(false),
  ]);
  const me = session
    ? { id: session.userId, nickname: session.nickname, emailVerified: verified }
    : null;

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
          initialMe={me}
          canAttach={isStorageConfigured()}
          // 인증 메일 발신 주소 — 수신 허용 목록에 넣으라고 화면에 띄운다.
          // 중국·일본 메일함이 모르는 발신자를 잘 거르기 때문에 필요하다
          mailFrom={mailFrom()}
        />
      </PageBody>
    </>
  );
}
