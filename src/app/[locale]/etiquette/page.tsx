import { getTranslations, setRequestLocale } from "next-intl/server";
import NightEtiquette from "@/components/NightEtiquette";
import SurvivalPhrases from "@/components/SurvivalPhrases";
import { getTopicImages } from "@/lib/etiquette-images";
import PageHero, { PageBody } from "@/components/PageHero";

export default async function EtiquettePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("etiquette");
  const topicImages = await getTopicImages();

  return (
    <>
      <PageHero
        image="/etiquette/pojangmacha.jpg"
        overline="Culture"
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <PageBody>
        <NightEtiquette topicImages={topicImages} />

        {/* 서바이벌 한국어 전체 통합 — 상황(에티켓) 밑의 표현 4개로 부족할 때
            검색·전체 표현집이 같은 페이지 하단에 이어진다. 별도 탭이던 것을
            "행동과 말을 한 흐름으로 배운다"는 피드백에 따라 합쳤다 */}
        <div id="phrasebook" className="mt-16 scroll-mt-24 border-t border-white/10 pt-10">
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
      </PageBody>
    </>
  );
}
