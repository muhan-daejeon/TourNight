import { getTranslations } from "next-intl/server";
import { Sunset, Sparkles, Thermometer, Umbrella } from "lucide-react";
import { getNightConditions } from "@/lib/conditions";

/** 오늘 밤 정보 바 — 날씨(기상청)·일몰·달 위상(천문연구원). 조회 실패 시 렌더 안 함 */
export default async function NightInfo() {
  const c = await getNightConditions();
  if (!c) return null;
  const t = await getTranslations("nightInfo");

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm backdrop-blur">
      {/* 대전 현재 기온·강수 — "오늘 밤 나가도 되나"의 첫 번째 답 */}
      {c.temp !== null && (
        <span className="flex items-center gap-1.5 text-slate-300">
          <Thermometer size={15} className="text-sky-300" />
          {t("tempNow")} <b className="text-white">{c.temp}°C</b>
        </span>
      )}
      {c.precip && (
        <span className="flex items-center gap-1 font-semibold text-sky-300">
          <Umbrella size={13} />
          {t(c.precip)}
        </span>
      )}
      <span className="flex items-center gap-1.5 text-slate-300">
        <Sunset size={15} className="text-amber-300" />
        {t("sunset")} <b className="text-white">{c.sunset}</b>
      </span>
      <span className="text-slate-300">
        {c.moonEmoji} {t("moonAge", { age: Math.round(c.lunAge) })}
      </span>
      {c.starNight && (
        <span className="flex items-center gap-1 font-semibold text-sky-300">
          <Sparkles size={13} />
          {t("starNight")}
        </span>
      )}
      {c.fullMoon && (
        <span className="font-semibold text-amber-300">{t("fullMoon")}</span>
      )}
    </div>
  );
}
