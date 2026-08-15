import { getTranslations, setRequestLocale } from "next-intl/server";
import { listFestivals } from "@/lib/festivals";
import FestivalPoster from "@/components/FestivalPoster";

// 연례 축제 캘린더 — 데이터가 정적이라 하루 주기면 충분하다
export const revalidate = 86400;

/**
 * 축제&행사 탭 — 1년치 대전 축제를 포스터로 나열한다.
 * 지금 열리는 축제가 맨 앞, 그다음 다가오는 순서 (listFestivals가 정렬).
 */
export default async function FestivalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("festivals");
  const festivals = listFestivals(locale);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="overline-label">All Year Round</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-slate-400">{t("subtitle")}</p>
      <p className="mt-3 max-w-2xl text-xs leading-relaxed text-slate-500">
        {t("scheduleNote")}
      </p>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {festivals.map((f) => (
          <FestivalPoster key={f.id} festival={f} />
        ))}
      </div>
    </div>
  );
}
