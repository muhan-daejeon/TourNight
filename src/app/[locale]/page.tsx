import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { MoonStar } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { fetchNightSpots } from "@/lib/kto";
import SpotExplorer from "@/components/SpotExplorer";

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
      {/* 히어로 — 밤하늘 (사진 로드 전에는 night-hero 그라데이션이 폴백) */}
      <section className="night-hero relative overflow-hidden">
        {/* 출처: Unsplash (무료 상업적 사용) — 추후 대전 실제 야경(공공누리)으로 교체 검토 */}
        <Image
          src="/hero-night.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* 텍스트 대비 확보 + 아래 섹션과 자연스러운 연결 */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/35 to-slate-950" />
        <div className="relative mx-auto max-w-5xl px-4 pt-20 pb-16 text-center sm:pt-28 sm:pb-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-slate-300 backdrop-blur">
            <MoonStar size={13} className="text-amber-300" />
            {site("description")}
          </span>
          <h1 className="mx-auto mt-7 max-w-3xl text-4xl font-extrabold leading-[1.2] tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-b from-white via-slate-100 to-slate-500 bg-clip-text text-transparent">
              {t("heroTitle")}
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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

      {/* 야간 명소 탐색 — 리스트 + 지도 */}
      <div className="mx-auto max-w-6xl px-4">
        <section id="spots" className="scroll-mt-20 pt-14 pb-24">
          <p className="overline-label">Tonight</p>
          <h2 className="mt-2 mb-6 text-2xl font-bold tracking-tight">
            {t("spotsSection")}
          </h2>
          <SpotExplorer spots={spots} />
        </section>
      </div>
    </div>
  );
}
