import { getTranslations, setRequestLocale } from "next-intl/server";
import SignupForm from "@/components/SignupForm";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { googleOAuthEnabled } from "@/lib/oauth";

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

      {googleOAuthEnabled() && (
        <div className="mb-6 space-y-4">
          <GoogleLoginButton
            href={`/api/auth/oauth/google?locale=${locale}`}
            label={t("continueWithGoogle")}
          />
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="h-px flex-1 bg-white/10" />
            {t("or")}
            <span className="h-px flex-1 bg-white/10" />
          </div>
        </div>
      )}

      <SignupForm />
    </div>
  );
}
