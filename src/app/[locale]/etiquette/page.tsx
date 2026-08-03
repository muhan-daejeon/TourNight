import { getTranslations, setRequestLocale } from "next-intl/server";
import { PhoneCall } from "lucide-react";
import EtiquetteTopics from "@/components/EtiquetteTopics";
import SurvivalPhrases from "@/components/SurvivalPhrases";

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

      {/* 긴급 연락처 — 외국인 야간 안전 */}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-5 py-3.5 text-sm">
        <span className="flex items-center gap-1.5 font-bold text-amber-300">
          <PhoneCall size={14} />
          {t("emergency.title")}
        </span>
        <span className="text-slate-300">
          <b className="text-white">112</b> {t("emergency.police")}
        </span>
        <span className="text-slate-300">
          <b className="text-white">119</b> {t("emergency.fire")}
        </span>
        <span className="text-slate-300">
          <b className="text-white">1330</b> {t("emergency.hotline")}
        </span>
      </div>

      <EtiquetteTopics />
      <SurvivalPhrases />
    </div>
  );
}
