import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ExternalLink, MapPin, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { allFestivalIds, getFestival, listFestivals } from "@/lib/festivals";
import { getSpot } from "@/lib/spots";
import FestivalPoster from "@/components/FestivalPoster";

export const revalidate = 86400;

export function generateStaticParams() {
  return allFestivalIds().map((festivalId) => ({ festivalId }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; festivalId: string }>;
}) {
  const { locale, festivalId } = await params;
  const festival = getFestival(festivalId, locale);
  if (!festival) return {};
  return { title: festival.title, description: festival.summary };
}

export default async function FestivalDetailPage({
  params,
}: {
  params: Promise<{ locale: string; festivalId: string }>;
}) {
  const { locale, festivalId } = await params;
  setRequestLocale(locale);
  const festival = getFestival(festivalId, locale);
  if (!festival) notFound();

  const t = await getTranslations("festivals");
  const monthName = (m: number) =>
    new Intl.DateTimeFormat(locale, { month: "long" }).format(
      new Date(2024, m - 1, 1),
    );
  const season =
    festival.startMonth === festival.endMonth
      ? t("annualMonth", { month: monthName(festival.startMonth) })
      : t("annualRange", {
          from: monthName(festival.startMonth),
          to: monthName(festival.endMonth),
        });

  // 축제장이 야경 명소로도 등록돼 있으면 그 스팟으로 이어준다.
  // 큐레이션 오타·스팟 삭제로 없을 수 있어 실패해도 페이지는 그대로 살린다.
  const spot = festival.spotContentId
    ? await getSpot(festival.spotContentId, locale).catch(() => null)
    : null;

  const others = listFestivals(locale)
    .filter((f) => f.id !== festival.id)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/festivals"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-amber-300"
      >
        <ArrowLeft size={15} />
        {t("backToList")}
      </Link>

      {/* 포스터와 같은 색으로 상세 상단을 깔아 목록 → 상세가 이어져 보이게 한다 */}
      <header
        className={`relative mt-5 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br px-7 py-12 sm:px-12 sm:py-16 ${festival.gradient}`}
      >
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-56 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.16),transparent_70%)]" />
        <div className="relative">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold tracking-wide ${festival.accent}`}
          >
            <Sparkles size={13} strokeWidth={2.4} />
            {festival.inSeason ? t("nowOpen") : t("upcoming")}
          </span>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)] sm:text-4xl">
            {festival.title}
          </h1>
          <dl className="mt-6 flex flex-col gap-2.5 text-sm text-slate-200">
            <div className="flex items-center gap-2">
              <dt className="sr-only">{t("season")}</dt>
              <CalendarDays size={15} className="shrink-0 text-slate-400" />
              <dd className="font-semibold">{season}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">{t("place")}</dt>
              <MapPin size={15} className="shrink-0 text-slate-400" />
              <dd>{festival.place}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="mt-9">
        <h2 className="text-lg font-bold tracking-tight">{t("aboutTitle")}</h2>
        <p className="mt-3 leading-relaxed text-slate-300">{festival.summary}</p>
        <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-slate-500">
          {t("scheduleNote")}
        </p>
        <a
          href={festival.homepage}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-amber-400/50 hover:text-amber-300"
        >
          {t("official")}
          <ExternalLink size={14} />
        </a>
      </section>

      {/* 축제장이 야경 명소이기도 하면 바로 그 명소를 거치는 코스를 짤 수 있다 */}
      {spot && (
        <section className="mt-10">
          <h2 className="text-lg font-bold tracking-tight">
            {t("relatedSpot")}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-white">{spot.title}</p>
              <p className="truncate text-sm text-slate-400">{spot.addr}</p>
            </div>
            <Link
              href={`/spots/${spot.contentId}`}
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-amber-400/50 hover:text-amber-300"
            >
              {t("viewSpot")}
            </Link>
            <Link
              href={`/courses?from=${encodeURIComponent(spot.contentId)}`}
              className="rounded-full bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300"
            >
              {t("planCta")}
            </Link>
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-bold tracking-tight">{t("more")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {others.map((f) => (
            <FestivalPoster key={f.id} festival={f} />
          ))}
        </div>
      </section>
    </div>
  );
}
