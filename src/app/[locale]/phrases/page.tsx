import { getTranslations, setRequestLocale } from "next-intl/server";
import SurvivalPhrases from "@/components/SurvivalPhrases";
import PageHero, { PageBody } from "@/components/PageHero";

export default async function PhrasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("etiquette");

  return (
    <>
      <PageHero
        image="/etiquette/dining.jpg"
        width="narrow"
        overline="Night Kit"
        title={t("phrasesTitle")}
        subtitle={t("phrasesSubtitle")}
      />
      <PageBody width="narrow">
        {locale === "ko" && (
          <p className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
            {t("koNote")}
          </p>
        )}
        <SurvivalPhrases />
      </PageBody>
    </>
  );
}
