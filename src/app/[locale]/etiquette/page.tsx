import { getTranslations, setRequestLocale } from "next-intl/server";
import EtiquetteTopics from "@/components/EtiquetteTopics";

export default async function EtiquettePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("etiquette");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="overline-label">Culture</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-3 text-slate-400">{t("subtitle")}</p>
      <EtiquetteTopics />
    </div>
  );
}
