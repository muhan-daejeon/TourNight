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
  const spots = await fetchNightSpots();

  return (
    <div>
      {/* 히어로 — 밤하늘 */}
      <section className="night-hero relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:py-32">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              {t("heroTitle")}
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-slate-400 sm:text-lg">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#spots"
              className="rounded-full bg-amber-400 px-6 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
            >
              {t("ctaSpots")}
            </a>
            <Link
              href="/etiquette"
              className="rounded-full border border-slate-600 px-6 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white"
            >
              {t("ctaGuide")}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        {/* 지도 */}
        <section className="pt-4 pb-12">
          <h2 className="mb-5 text-xl font-bold">{t("mapSection")}</h2>
          <NightMap spots={spots} />
        </section>

        {/* 야간 명소 목록 */}
        <section id="spots" className="scroll-mt-20 pb-20">
          <h2 className="mb-5 text-xl font-bold">{t("spotsSection")}</h2>
          <SpotList spots={spots} />
        </section>
      </div>
    </div>
  );
}
