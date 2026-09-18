import { getTranslations, setRequestLocale } from "next-intl/server";
import NightEtiquette from "@/components/NightEtiquette";
import PhrasebookSection from "@/components/PhrasebookSection";
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
            "행동과 말을 한 흐름으로 배운다"는 피드백에 따라 합쳤다. 같은 내용을
            꿈순이 팝업(MascotGuide)에서도 그대로 보여준다 — PhrasebookSection으로
            뽑아 둘이 함께 쓴다 */}
        <div id="phrasebook" className="mt-16 scroll-mt-24 border-t border-white/10 pt-10">
          <PhrasebookSection />
        </div>
      </PageBody>
    </>
  );
}
