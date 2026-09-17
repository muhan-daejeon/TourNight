import { getTranslations, setRequestLocale } from "next-intl/server";
import ProfileForm from "@/components/ProfileForm";
import LogoutButton from "@/components/LogoutButton";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const welcome = sp.welcome === "1";

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <p className="overline-label">Account</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        {welcome ? t("welcomeTitle") : t("profileTitle")}
      </h1>
      <p className="mt-3 mb-8 text-slate-400">
        {welcome ? t("welcomeSubtitle") : t("profileSubtitle")}
      </p>
      <ProfileForm welcome={welcome} />

      {/* 찜한 장소·코스는 헤더 하트 아이콘 → /saved로 옮겼다 (중복 제거).
          내가 저장한 표현(MyPhrases)은 K-Life 가이드에만 남기고 여기선 뺀다 */}

      {/* 새로 가입한 직후(welcome)엔 로그아웃할 이유가 없다 */}
      {!welcome && (
        <div className="mt-10 border-t border-slate-200 pt-6">
          <LogoutButton />
        </div>
      )}
    </div>
  );
}
