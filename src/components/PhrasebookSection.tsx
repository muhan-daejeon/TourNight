"use client";

import { useLocale, useTranslations } from "next-intl";
import SurvivalPhrases from "./SurvivalPhrases";

/**
 * "서바이벌 한국어" 섹션 — 원래 K-Life 가이드(/etiquette) 페이지 맨 아래
 * 있던 내용을 그대로 뽑아냈다. 그 페이지 하단과 꿈순이 팝업, 두 곳에서
 * 같은 내용을 함께 쓴다.
 */
export default function PhrasebookSection() {
  const t = useTranslations("etiquette");
  const locale = useLocale();

  return (
    <div>
      <p className="overline-label">Night Kit</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">{t("phrasesTitle")}</h2>
      <p className="mt-1.5 text-sm text-slate-400">{t("phrasesSubtitle")}</p>
      {locale === "ko" && (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
          {t("koNote")}
        </p>
      )}
      <div className="mt-5 mx-auto max-w-3xl">
        <SurvivalPhrases searchOnly />
      </div>
    </div>
  );
}
