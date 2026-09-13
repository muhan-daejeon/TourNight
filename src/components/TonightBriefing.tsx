import { getTranslations } from "next-intl/server";
import { Sunset, Thermometer, Umbrella } from "lucide-react";
import { getNightConditions } from "@/lib/conditions";
import LastTrainCountdown from "./LastTrainCountdown";

/**
 * 🌙 오늘 밤 브리핑 — 히어로 바로 아래 한 줄.
 * 무드 헤드라인은 팀 피드백으로 뺐고, 온도·강수·일몰·월령·막차 정보만
 * 메인 이미지 아래에 붙인다.
 */
export default async function TonightBriefing() {
  const c = await getNightConditions();
  if (!c) return null;
  const t = await getTranslations("briefing");

  return (
    <section className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[13px] text-slate-400">
      {c.temp !== null && (
        <span className="flex items-center gap-1.5">
          <Thermometer size={14} className="text-sky-600" />
          <b className="text-slate-900">{c.temp}°C</b>
        </span>
      )}
      {c.precip && (
        <span className="flex items-center gap-1 font-semibold text-sky-600">
          <Umbrella size={13} />
          {t(`precip.${c.precip}`)}
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <Sunset size={14} className="text-amber-600" />
        {t("sunset")} <b className="text-slate-900">{c.sunset}</b>
      </span>
      <span>
        {c.moonEmoji} {t("moonAge", { age: Math.round(c.lunAge) })}
      </span>
      <LastTrainCountdown />
    </section>
  );
}
