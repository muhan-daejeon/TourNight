import { getTranslations, setRequestLocale } from "next-intl/server";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <p className="overline-label">Account</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        {t("profileTitle")}
      </h1>
      <p className="mt-3 mb-8 text-slate-400">{t("profileSubtitle")}</p>
      <ProfileForm />
    </div>
  );
}
