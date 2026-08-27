import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Car, Clock, MapPin, Phone, Tag, XCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getLocalDetail, type LocalKind } from "@/lib/kto-live";
import { getLocalSpotsTranslated } from "@/lib/local-spots";
import { getSpotsNearPoint } from "@/lib/spots";
import { PageBody } from "@/components/PageHero";

/**
 * 맛집·숙박·쇼핑 상세. 야간 서비스답게 영업시간을 제일 앞에 둔다.
 * 아래에는 근처 야간 명소를 붙여 "여기서 저녁 먹고 어디 갈까"로 이어지게 한다.
 */
export default async function LocalSpotDetail({
  kind,
  contentId,
  locale,
}: {
  kind: LocalKind;
  contentId: string;
  locale: string;
}) {
  setRequestLocale(locale);
  const t = await getTranslations("local");

  const spots = await getLocalSpotsTranslated(kind, locale);
  const spot = spots.find((s) => s.contentId === contentId);
  if (!spot) notFound();

  const [detail, nearby] = await Promise.all([
    getLocalDetail(kind, contentId, locale),
    getSpotsNearPoint(spot.mapX, spot.mapY, { limit: 4, locale }),
  ]);

  const rows = [
    { icon: Clock, label: t(`${kind}.hours`), value: detail.hours, strong: true },
    { icon: XCircle, label: t("restDay"), value: detail.restDay },
    { icon: Tag, label: t(`${kind}.menu`), value: detail.menu },
    { icon: Car, label: t("parking"), value: detail.parking },
    { icon: Phone, label: t("contact"), value: detail.contact ?? spot.tel },
  ].filter((r) => r.value);

  return (
    <>
      {/* 사진 히어로 */}
      <div className="relative h-[46vh] min-h-[300px]">
        <Image src={spot.imageUrl!} alt={spot.title} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/20" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-4 pb-8">
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] sm:text-4xl">
              {spot.title}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-300">
              <MapPin size={14} />
              {spot.addr}
            </p>
          </div>
        </div>
      </div>

      <PageBody>
        <Link
          href={`/${kind}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-amber-300"
        >
          <ArrowLeft size={15} />
          {t("backToList")}
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* 이용 정보 */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-lg font-bold">{t("infoTitle")}</h2>
            {rows.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">{t("noInfo")}</p>
            ) : (
              <dl className="mt-4 space-y-3">
                {rows.map(({ icon: Icon, label, value, strong }) => (
                  <div key={label} className="flex gap-3">
                    <Icon size={16} className="mt-0.5 shrink-0 text-amber-300" />
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-500">{label}</dt>
                      <dd className={`mt-0.5 text-sm ${strong ? "font-bold text-white" : "text-slate-200"}`}>
                        {value}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            )}
            <a
              href={`https://map.kakao.com/link/to/${encodeURIComponent(spot.title)},${spot.mapY},${spot.mapX}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
            >
              {t("directions")}
            </a>
          </section>

          {/* 근처 야간 명소 — 여기서 어디로 갈지 */}
          <aside>
            <h2 className="text-lg font-bold">{t("nearbySpots")}</h2>
            <ul className="mt-4 space-y-2">
              {nearby.map((n) => (
                <li key={n.contentId}>
                  <Link
                    href={`/spots/${n.contentId}`}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2 transition hover:border-amber-400/40"
                  >
                    <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                      {n.imageUrl && (
                        <Image src={n.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{n.title}</p>
                      <p className="text-xs text-amber-300">
                        {n.distanceM < 1000
                          ? `${Math.round(n.distanceM)}m`
                          : `${(n.distanceM / 1000).toFixed(1)}km`}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
        <p className="mt-8 text-[11px] text-slate-600">{t("source")}</p>
      </PageBody>
    </>
  );
}
