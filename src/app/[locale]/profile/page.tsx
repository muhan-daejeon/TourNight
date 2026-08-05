import { getTranslations, setRequestLocale } from "next-intl/server";
import ProfileForm from "@/components/ProfileForm";

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
    </div>
  );
}
