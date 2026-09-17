import { getTranslations } from "next-intl/server";
import { Sunset, Thermometer, Umbrella } from "lucide-react";
import { getNightConditions } from "@/lib/conditions";
import LastTrainCountdown from "./LastTrainCountdown";

/**
 * 🌙 오늘 밤 브리핑 — 히어로 사진 안쪽 하단 한 줄.
 *
 * 전에는 사진 아래 흰 배경에 회색 글자로 떠 있어 눈에 잘 안 들어왔다.
 * 야경 사진 위로 올리면서 글자를 흰색으로 바꾸고, 반투명 검정 알약을
 * 깔아 밝은 부분(조명·물빛) 위에서도 읽히게 한다.
 */
export default async function TonightBriefing() {
  const c = await getNightConditions();
  if (!c) return null;
  const t = await getTranslations("briefing");

  return (
    <section className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-full bg-black/45 px-6 py-2.5 text-[13px] text-white/80 backdrop-blur-sm">
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
    </section>
  );
}
