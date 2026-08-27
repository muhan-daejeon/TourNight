import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHero, { PageBody } from "@/components/PageHero";
import LocalSpotList from "@/components/LocalSpotList";
import { type LocalKind } from "@/lib/kto-live";
import { getLocalSpotsTranslated } from "@/lib/local-spots";

const IMAGE: Record<LocalKind, string> = {
  food: "/etiquette/latefood.jpg",
  stay: "/spots/jungangro-night.jpg",
  shopping: "/etiquette/convenience.jpg",
};

const OVERLINE: Record<LocalKind, string> = {
  food: "Night Eats",
  stay: "Night Stay",
  shopping: "Night Shopping",
};

/** 맛집·숙박·쇼핑 세 탭이 같은 틀을 쓴다 — 분류 코드와 사진만 다르다 */
export default async function LocalSpotPage({
  kind,
  locale,
}: {
  kind: LocalKind;
  locale: string;
}) {
  setRequestLocale(locale);
  const t = await getTranslations("local");
  const spots = await getLocalSpotsTranslated(kind, locale);

  return (
    <>
      <PageHero
        image={IMAGE[kind]}
        overline={OVERLINE[kind]}
        title={t(`${kind}.title`)}
        subtitle={t(`${kind}.subtitle`, { count: spots.length })}
      />
      <PageBody>
        <LocalSpotList kind={kind} spots={spots} />
        <p className="mt-8 text-[11px] text-slate-600">{t("source")}</p>
      </PageBody>
    </>
  );
}
