import { getTranslations, setRequestLocale } from "next-intl/server";
import LoginForm from "@/components/LoginForm";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { googleOAuthEnabled } from "@/lib/oauth";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  // 로그인 필요 화면에서 튕겨 온 경우(middleware가 ?next= 를 붙인다) — 같은 사이트
  // 경로일 때만 신뢰한다 ("//evil" 같은 외부 이동 방지)
  const next = sp.next && /^\/(?!\/)/.test(sp.next) ? sp.next : null;

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <p className="overline-label">TourNight</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        {t("loginTitle")}
      </h1>
      <p className="mt-3 mb-8 text-slate-400">{t("loginSubtitle")}</p>

      {next && (
        <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {t("loginRequiredNotice")}
        </p>
      )}

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

      <LoginForm oauthError={sp.error === "oauth"} next={next} />
    </div>
  );
}
