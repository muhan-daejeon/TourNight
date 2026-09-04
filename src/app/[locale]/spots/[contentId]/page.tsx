import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  BedDouble,
  MapPin,
  Navigation,
  Telescope,
  Trees,
  Sparkles,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getSpot,
  getNearbySpots,
  getCongestion,
  type NearbySpot,
} from "@/lib/spots";
import { fetchNearbyStays } from "@/lib/kto";
import NightMap from "@/components/NightMap";
import SpotGuide from "@/components/SpotGuide";
import CongestionForecast from "@/components/CongestionForecast";
import AreaVisitors from "@/components/AreaVisitors";
import { TransitCard } from "@/components/TransitInfo";
import Skeleton from "@/components/Skeleton";
import { getSpotTransit } from "@/lib/transit";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  science: Telescope,
  nature: Trees,
  festival: Sparkles,
  city: Building2,
};

const CATEGORY_TEXT: Record<string, string> = {
  science: "text-sky-300",
  nature: "text-emerald-300",
  festival: "text-pink-300",
  city: "text-amber-300",
};

const CATEGORY_SCENE: Record<string, string> = {
  science: "from-sky-950 via-slate-900 to-cyan-950",
  nature: "from-emerald-950 via-slate-900 to-teal-950",
  festival: "from-fuchsia-950 via-slate-900 to-rose-950",
  city: "from-amber-950 via-slate-900 to-orange-950",
};

function formatDistance(m: number) {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

function NearbyCard({ spot }: { spot: NearbySpot }) {
  const Icon = CATEGORY_ICON[spot.category];
  return (
    <Link
      href={`/spots/${spot.contentId}`}
      className="glass-card group flex items-center gap-3 rounded-xl p-2.5"
    >
      <div
        className={`relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${CATEGORY_SCENE[spot.category]}`}
      >
        {spot.imageUrl ? (
          <Image
            src={spot.imageUrl}
            alt={spot.title}
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <Icon size={22} strokeWidth={1.5} className="text-white/30" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-semibold text-slate-100 group-hover:text-amber-300">
          {spot.title}
        </h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-slate-500">
          <span className="font-semibold text-amber-300/90">
            {formatDistance(spot.distanceM)}
          </span>
          <span className="text-slate-700">·</span>
          <span className="truncate">{spot.addr}</span>
        </p>
      </div>
    </Link>
  );
}

/**
 * 혼잡도만 따로 불러온다.
 *
 * 이 값 하나가 페이지 전체를 5초 넘게 붙잡고 있었다 — 대전 5개 구의 집중률을
 * 공사에서 한 구씩 받아 오느라 HTTP 25회가 줄줄이 이어진다(실측 6초). 사진·이름·
 * 주소·막차는 즉시 준비되는데 그것까지 같이 기다리게 할 이유가 없다.
 *
 * Suspense 안에 두면 나머지 화면이 먼저 그려지고 이 칸만 나중에 채워진다.
 */
async function CongestionSection({
  contentId,
  locale,
}: {
  contentId: string;
  locale: string;
}) {
  const days = await getCongestion(contentId);
  return <CongestionForecast days={days} locale={locale} />;
}

export default async function SpotPage({
  params,
}: {
  params: Promise<{ locale: string; contentId: string }>;
}) {
  const { locale, contentId: rawId } = await params;
  setRequestLocale(locale);
  const contentId = decodeURIComponent(rawId);

  const spot = await getSpot(contentId, locale);
  if (!spot) notFound();

  const t = await getTranslations("spot");
  const home = await getTranslations("home");
  const Icon = CATEGORY_ICON[spot.category];

  // 혼잡도·방문객 통계는 여기서 기다리지 않는다 (아래 Suspense에서 따로 채운다)
  const [natureNearby, nearby, stays, transit] = await Promise.all([
    spot.category === "nature"
      ? Promise.resolve([])
      : getNearbySpots(contentId, { category: "nature", limit: 3, locale }),
    getNearbySpots(contentId, { limit: 4, locale }),
    fetchNearbyStays(spot.mapX, spot.mapY),
    getSpotTransit(contentId),
  ]);

  const kakaoDirections = `https://map.kakao.com/link/to/${encodeURIComponent(spot.title)},${spot.mapY},${spot.mapX}`;

  return (
    <div>
      {/* 히어로 이미지 — 야경 사진을 크게 보여준다 */}
      <div className="relative h-80 overflow-hidden sm:h-[26rem] lg:h-[30rem]">
        {spot.imageUrl ? (
          <Image
            src={spot.imageUrl}
            alt={spot.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div
            className={`h-full w-full bg-gradient-to-br ${CATEGORY_SCENE[spot.category]}`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/20 to-slate-950" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-4 pb-6">
            <p
              className={`flex items-center gap-1.5 text-sm font-semibold ${CATEGORY_TEXT[spot.category]}`}
            >
              <Icon size={14} strokeWidth={2.2} />
              {home(`categories.${spot.category}`)}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-4xl">
              {spot.title}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-300">
              <MapPin size={14} className="shrink-0 text-slate-400" />
              {spot.addr}
            </p>
            {/* 한글 원문 주소도 남겨 둔다 — 택시 기사에게는 이쪽을 보여줘야 통한다 */}
            {spot.addrKo && spot.addrKo !== spot.addr && (
              <p className="mt-0.5 pl-[22px] text-[13px] text-slate-400">
                {spot.addrKo}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20">
        {/* 상단 액션 */}
        <div className="flex items-center justify-between py-5">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={15} />
            {t("back")}
          </Link>
          <a
            href={kakaoDirections}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.3)] transition hover:bg-amber-300"
          >
            <Navigation size={15} />
            {t("directions")}
          </a>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-10">
          <div className="space-y-6">
            {/* AI 야간 가이드 */}
            <SpotGuide contentId={spot.contentId} />

            {/* 인근 정류장·막차 — 야간 명소는 막차가 22시대라 먼저 보여준다 */}
            <TransitCard transit={transit} />

            {/* 혼잡도 예측 — KT 이동통신 데이터 기반 (데이터 있는 스팟만) */}
            <Suspense
              fallback={<Skeleton className="h-40 w-full rounded-2xl" />}
            >
              <CongestionSection contentId={contentId} locale={locale} />
            </Suspense>

            {/* 지역 방문객 규모 — KTO 빅데이터 (구 단위 실측) */}
            <Suspense
              fallback={<Skeleton className="h-14 w-full rounded-2xl" />}
            >
              <AreaVisitors addr={spot.addrKo ?? spot.addr} />
            </Suspense>

            {/* 근처 자연 야경 (대전 차별점: 도심 → 자연 연계) */}
            {natureNearby.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold">{t("nearbyNature")}</h2>
                <div className="flex flex-col gap-2.5">
                  {natureNearby.map((s) => (
                    <NearbyCard key={s.contentId} spot={s} />
                  ))}
                </div>
              </section>
            )}

            {/* 주변 스팟 */}
            <section>
              <h2 className="mb-3 text-lg font-bold">{t("nearby")}</h2>
              <div className="flex flex-col gap-2.5">
                {nearby.map((s) => (
                  <NearbyCard key={s.contentId} spot={s} />
                ))}
              </div>
            </section>

            {/* 주변 숙소 — 야간 소비→숙박 연계 (계획서 기능 4) */}
            {stays.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                  <BedDouble size={17} className="text-amber-300" />
                  {t("nearbyStay")}
                </h2>
                <div className="flex flex-col gap-2.5">
                  {stays.map((stay) => (
                    <a
                      key={stay.contentId}
                      href={`https://map.kakao.com/link/map/${encodeURIComponent(stay.title)},${stay.mapY},${stay.mapX}`}
                      target="_blank"
                      rel="noreferrer"
                      className="glass-card group flex items-center gap-3 rounded-xl p-2.5"
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                        <Image
                          src={stay.imageUrl}
                          alt={stay.title}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15px] font-semibold text-slate-100 group-hover:text-amber-300">
                          {stay.title}
                        </h3>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-slate-500">
                          <span className="font-semibold text-amber-300/90">
                            {formatDistance(stay.distM)}
                          </span>
                          <span className="text-slate-700">·</span>
                          <span className="truncate">{stay.addr}</span>
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* 위치 지도 */}
          <div>
            <h2 className="mb-3 text-lg font-bold lg:sr-only">{t("map")}</h2>
            <div className="h-72 lg:sticky lg:top-20 lg:h-[520px]">
              <NightMap spots={[spot]} selectedId={spot.contentId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
