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
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-slate-400">{t("subtitle")}</p>
      <EtiquetteTopics />
    </div>
  );
}
