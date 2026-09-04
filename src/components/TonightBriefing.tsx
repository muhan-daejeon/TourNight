import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Moon, Sparkles, Sunset, Thermometer, Umbrella } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getNightConditions } from "@/lib/conditions";
import type { NightSpot } from "@/lib/kto";
import LastTrainCountdown from "./LastTrainCountdown";

/**
 * 🌙 오늘 밤 브리핑 — 히어로 바로 아래의 "그래서 오늘 밤 뭐 하지"의 첫 답.
 *
 * 흩어져 있던 실시간 데이터(기상청 날씨 + 천문연 일몰·월령 + 도시철도 막차)를
 * 한 카드로 모으고, 오늘 밤의 조건에 맞는 추천 한 줄과 명소를 함께 낸다:
 * 비·눈 → 실내 위주(science·city), 그믐 맑음 → 별 명소(nature),
 * 보름 맑음 → 달맞이(nature), 그 외 → 오늘의 추천.
 * 정적 포털과 달리 "지금"에 반응하는 화면이라는 것을 첫 화면에서 보여준다.
 * 조건 조회 실패 시 카드 전체를 숨긴다 (홈을 막지 않는다).
 */
export default async function TonightBriefing({ spots }: { spots: NightSpot[] }) {
  const c = await getNightConditions();
  if (!c) return null;
  const t = await getTranslations("briefing");

  // 오늘 밤의 성격 — 문구 키와 어울리는 명소 카테고리를 함께 정한다
  const mood = c.precip
    ? ({ key: "wet", categories: ["science", "city"] } as const)
    : c.starNight
      ? ({ key: "stars", categories: ["nature"] } as const)
      : c.fullMoon
        ? ({ key: "moon", categories: ["nature"] } as const)
        : ({ key: "clear", categories: ["city", "nature"] } as const);

  const photoSpots = spots.filter((s) => s.imageUrl);
  const matched = photoSpots.filter((s) =>
    (mood.categories as readonly string[]).includes(s.category),
  );
  const picks = (matched.length >= 2 ? matched : photoSpots).slice(0, 3);

  return (
    <section className="rounded-3xl border border-indigo-400/25 bg-gradient-to-r from-indigo-500/10 via-slate-900/40 to-slate-900/40 p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="overline-label flex items-center gap-1.5">
            <Moon size={13} className="text-amber-300" />
            {t("overline")}
          </p>
          <h2 className="mt-1.5 text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">
            {t(`mood.${mood.key}`)}
          </h2>

          {/* 실시간 지표 한 줄 — 날씨·일몰·월령·막차 */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-300">
            {c.temp !== null && (
              <span className="flex items-center gap-1.5">
                <Thermometer size={14} className="text-sky-300" />
                <b className="text-white">{c.temp}°C</b>
              </span>
            )}
            {c.precip && (
              <span className="flex items-center gap-1 font-semibold text-sky-300">
                <Umbrella size={13} />
                {t(`precip.${c.precip}`)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Sunset size={14} className="text-amber-300" />
              {t("sunset")} <b className="text-white">{c.sunset}</b>
            </span>
            <span>
              {c.moonEmoji} {t("moonAge", { age: Math.round(c.lunAge) })}
            </span>
            <LastTrainCountdown />
          </div>
        </div>

        {/* 오늘 밤 조건에 맞는 명소 — 카드가 곧 행선지가 되게 */}
        {picks.length > 0 && (
          <div className="flex gap-2.5">
            {picks.map((s) => (
              <Link
                key={s.contentId}
                href={`/spots/${s.contentId}`}
                className="group w-[104px] shrink-0 sm:w-[120px]"
              >
                <span className="relative block h-16 overflow-hidden rounded-xl border border-white/10 bg-slate-800 sm:h-[72px]">
                  <Image
                    src={s.imageUrl!}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </span>
                <span className="mt-1.5 line-clamp-1 block text-xs font-semibold text-slate-300 transition group-hover:text-amber-300">
                  {s.title}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {(c.starNight || c.fullMoon) && !c.precip && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-sky-300">
          <Sparkles size={12} />
          {c.starNight ? t("starNight") : t("fullMoon")}
        </p>
      )}
    </section>
  );
}
