import { getTranslations, setRequestLocale } from "next-intl/server";
import { getUpcomingFestivals } from "@/lib/festivals";
import FestivalPoster from "@/components/FestivalPoster";
import PageHero, { PageBody } from "@/components/PageHero";

// 야간 검증 스팟 기준, 1시간 주기로 재생성
export const revalidate = 3600;

/**
 * 축제&행사 탭 — 공사 축제 목록에서 대전 축제를 받아 포스터로 보여준다.
 * 이미 끝난 축제는 받아오지 않는다 — 진행 중과 예정만 선다.
 */
export default async function FestivalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("festivals");
  const festivals = await getUpcomingFestivals(locale);

  return (
    <>
      <PageHero
        image="/spots/hanbit-tower.jpg"
        overline="Festivals"
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <PageBody>
        <p className="max-w-2xl text-xs leading-relaxed text-slate-500">
          {t("scheduleNote")}
        </p>

        {festivals.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-12 text-center text-sm text-slate-500">
            {t("empty")}
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {festivals.map((f) => (
              <FestivalPoster key={f.contentId} spot={f} />
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
