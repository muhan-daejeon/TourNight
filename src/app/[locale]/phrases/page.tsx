import { getTranslations, setRequestLocale } from "next-intl/server";
import SurvivalPhrases from "@/components/SurvivalPhrases";

export default async function PhrasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("etiquette");

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <p className="overline-label">Night Kit</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        {t("phrasesTitle")}
      </h1>
      <p className="mt-3 text-slate-400">{t("phrasesSubtitle")}</p>
      {locale === "ko" && (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
          {t("koNote")}
        </p>
      )}
      <SurvivalPhrases />
    </div>
  );
}
