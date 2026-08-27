import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { MapPin, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { LocalKind, LocalSpot } from "@/lib/kto-live";

/**
 * 맛집·숙박·쇼핑 목록 카드. 명소 카드와 같은 인상(사진 위 제목)으로 맞춘다.
 * 자치구를 해시태그로 붙여 훑어볼 때 지역을 바로 알 수 있게 한다.
 */
export default async function LocalSpotList({
  kind,
  spots,
}: {
  kind: LocalKind;
  spots: LocalSpot[];
}) {
  const t = await getTranslations("local");
  const district = (addr: string) => addr.match(/([가-힣]+[구군])/)?.[1] ?? null;

  if (spots.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-12 text-center text-sm text-slate-500">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {spots.map((s) => {
        const gu = district(s.addr);
        return (
          <Link
            key={s.contentId}
            href={`/${kind}/${s.contentId}`}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-1 hover:border-amber-400/40 hover:shadow-[0_12px_36px_rgba(0,0,0,0.5)]"
          >
            <div className="relative h-40 sm:h-44">
              <Image
                src={s.imageUrl!}
                alt={s.title}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition duration-500 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
              {gu && (
                <span className="absolute left-3 top-3 rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold text-indigo-200 backdrop-blur">
                  #{gu}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-3.5">
                <h3 className="truncate text-[15px] font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] group-hover:text-amber-300">
                  {s.title}
                </h3>
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-300">
                  <MapPin size={11} className="shrink-0" />
                  {s.addr}
                </p>
              </div>
            </div>
            {s.tel && (
              <p className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs text-slate-400">
                <Phone size={11} />
                {s.tel}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
