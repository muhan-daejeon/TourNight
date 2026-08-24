import { getTranslations, setRequestLocale } from "next-intl/server";
import NightEtiquette from "@/components/NightEtiquette";
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
      </PageBody>
    </>
  );
}
