import { getTranslations, setRequestLocale } from "next-intl/server";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <p className="overline-label">TourNight</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        {t("loginTitle")}
      </h1>
      <p className="mt-3 mb-8 text-slate-400">{t("loginSubtitle")}</p>
      <LoginForm />
    </div>
  );
}
