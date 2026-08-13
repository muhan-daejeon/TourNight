import { getTranslations, setRequestLocale } from "next-intl/server";
import CommunityBoard from "@/components/CommunityBoard";
import { listPosts } from "@/lib/community";
import { isStorageConfigured } from "@/lib/storage";

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
    <div className="mx-auto max-w-2xl px-4 py-16">
      <p className="overline-label">Night Talk</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-3 text-slate-400">{t("subtitle")}</p>
      <div className="mt-8">
        <CommunityBoard
          initialPosts={posts}
          canAttach={isStorageConfigured()}
        />
      </div>
    </div>
  );
}
