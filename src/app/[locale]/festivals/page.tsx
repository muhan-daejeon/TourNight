import { getTranslations, setRequestLocale } from "next-intl/server";
import { getVerifiedNightSpots, pickFestivals } from "@/lib/spots";
import FestivalPoster from "@/components/FestivalPoster";

// 야간 검증 스팟 기준, 1시간 주기로 재생성
export const revalidate = 3600;

/**
 * 축제&행사 탭 — '축제' 카테고리로 등록·검증된 야간 명소를 포스터로 보여준다.
 * 축제 일정은 따로 두지 않는다(출처가 없다). 자세한 내용은 각 명소 상세에서.
 */
export default async function FestivalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("festivals");
  const festivals = pickFestivals(await getVerifiedNightSpots(locale));

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="overline-label">Festivals</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-slate-400">{t("subtitle")}</p>
      <p className="mt-3 max-w-2xl text-xs leading-relaxed text-slate-500">
        {t("scheduleNote")}
      </p>

      {festivals.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-12 text-center text-sm text-slate-500">
          {t("empty")}
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {festivals.map((f) => (
            <FestivalPoster key={f.contentId} spot={f} />
          ))}
        </div>
      )}
    </div>
  );
}
