import { getTranslations, setRequestLocale } from "next-intl/server";
import SignupForm from "@/components/SignupForm";

export default async function SignupPage({
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
        {t("signupTitle")}
      </h1>
      <p className="mt-3 mb-8 text-slate-400">{t("signupSubtitle")}</p>
      <SignupForm />
    </div>
  );
}
