import { getTranslations, setRequestLocale } from "next-intl/server";
import ProfileForm from "@/components/ProfileForm";
import MyPhrases from "@/components/MyPhrases";
import LogoutButton from "@/components/LogoutButton";
import { RESTAURANT_STEPS } from "@/lib/klife-restaurant";

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="overline-label">Account</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {welcome ? t("welcomeTitle") : t("profileTitle")}
          </h1>
        </div>
        {/* 새로 가입한 직후(welcome)엔 로그아웃할 이유가 없다 */}
        {!welcome && <LogoutButton />}
      </div>
      <p className="mt-3 mb-8 text-slate-400">
        {welcome ? t("welcomeSubtitle") : t("profileSubtitle")}
      </p>
      <ProfileForm welcome={welcome} />

      {/* 찜한 장소·코스는 헤더 하트 아이콘 → /saved로 옮겼다 (중복 제거) */}

      {/* K-Life 가이드 하단과 같은 내용 — 시나리오가 늘면 이 배열에 추가한다 */}
      <MyPhrases scenarios={[{ scenario: "restaurant", steps: RESTAURANT_STEPS }]} />
    </div>
  );
}
