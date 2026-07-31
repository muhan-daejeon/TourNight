import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { fetchNightSpots } from "@/lib/kto";

const CATEGORY_ICON: Record<string, string> = {
  science: "🔭",
  nature: "🌌",
  festival: "🎆",
  city: "🌉",
};

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
    <div className="mx-auto max-w-5xl px-4">
      {/* 히어로 */}
      <section className="py-16 text-center sm:py-24">
        <h1 className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="mt-4 text-slate-400">{t("heroSubtitle")}</p>
      </section>

      {/* 야간 명소 목록 */}
      <section className="pb-16">
        <h2 className="mb-6 text-xl font-bold">{t("spotsSection")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spots.map((spot) => (
            <div
              key={spot.contentId}
              className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 transition hover:border-slate-600"
            >
              <div className="relative flex h-36 items-center justify-center bg-slate-800 text-4xl">
                {spot.imageUrl ? (
                  <Image
                    src={spot.imageUrl}
                    alt={spot.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span>{CATEGORY_ICON[spot.category]}</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{spot.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{spot.addr}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
