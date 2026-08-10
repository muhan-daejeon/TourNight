import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import type { CongestionDay } from "@/lib/spots";

const INTL_LOCALE: Record<string, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
};

function level(rate: number): "low" | "mid" | "high" {
  if (rate < 33) return "low";
  if (rate < 66) return "mid";
  return "high";
}

const LEVEL_STYLE: Record<string, string> = {
  low: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  mid: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  high: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

/** 향후 7일 혼잡도 예측 (KT 이동통신 데이터 기반) — 데이터 없는 스팟은 미제공 안내 */
export default async function CongestionForecast({
  days,
  locale,
}: {
  days: CongestionDay[];
  locale: string;
}) {
  const t = await getTranslations("spot.congestion");

  if (days.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Users size={17} className="text-amber-300" />
          {t("title")}
        </h2>
        <p className="mt-3 text-sm text-slate-500">{t("unavailable")}</p>
      </section>
    );
  }

  const fmt = new Intl.DateTimeFormat(INTL_LOCALE[locale] ?? "en-US", {
    weekday: "short",
  });
  const best = days.reduce((a, b) => (b.rate < a.rate ? b : a));

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Users size={17} className="text-amber-300" />
        {t("title")}
      </h2>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const lv = level(d.rate);
          const date = new Date(`${d.date}T00:00:00+09:00`);
          return (
            <div
              key={d.date}
              className={`rounded-xl border py-2 text-center ${LEVEL_STYLE[lv]}`}
            >
              <div className="text-[11px] font-semibold opacity-80">
                {fmt.format(date)}
              </div>
              <div className="mt-0.5 text-[11px] font-bold">{t(lv)}</div>
              <div className="text-[10px] opacity-70">{Math.round(d.rate)}%</div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {t("best")}:{" "}
        <b className="text-emerald-300">
          {fmt.format(new Date(`${best.date}T00:00:00+09:00`))}
        </b>
        <span className="mx-2 text-slate-700">·</span>
        {t("source")}
      </p>
    </section>
  );
}
