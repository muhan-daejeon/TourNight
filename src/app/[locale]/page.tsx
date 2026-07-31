import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchNightSpots } from "@/lib/kto";
import NightMap from "@/components/NightMap";
import SpotList from "@/components/SpotList";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const site = await getTranslations("site");
  const spots = await fetchNightSpots();

  return (
    <div>
      {/* 히어로 — 밤하늘 */}
      <section className="night-hero relative overflow-hidden">
        <div className="moon-glow" />
        <div className="relative mx-auto max-w-5xl px-4 py-28 text-center sm:py-40">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-slate-300 backdrop-blur">
            <span className="text-amber-300">🌙</span>
            {site("description")}
          </span>
          <h1 className="mt-8 text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-6xl">
            <span className="bg-gradient-to-b from-white via-slate-100 to-slate-500 bg-clip-text text-transparent">
              {t("heroTitle")}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
            {t("heroSubtitle")}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#spots"
              className="rounded-full bg-amber-400 px-7 py-3 text-sm font-bold text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.35)] transition hover:bg-amber-300 hover:shadow-[0_0_36px_rgba(251,191,36,0.5)]"
            >
              {t("ctaSpots")}
            </a>
            <Link
              href="/etiquette"
              className="rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-slate-200 backdrop-blur transition hover:border-white/30 hover:text-white"
            >
              {t("ctaGuide")}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        {/* 지도 */}
        <section className="pt-16 pb-14">
          <p className="overline-label">Map</p>
          <h2 className="mt-2 mb-6 text-2xl font-bold tracking-tight">
            {t("mapSection")}
          </h2>
          <NightMap spots={spots} />
        </section>

        {/* 야간 명소 목록 */}
        <section id="spots" className="scroll-mt-20 pb-24">
          <p className="overline-label">Tonight</p>
          <h2 className="mt-2 mb-6 text-2xl font-bold tracking-tight">
            {t("spotsSection")}
          </h2>
          <SpotList spots={spots} />
        </section>
      </div>
    </div>
  );
}
