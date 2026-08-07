"use client";

import { useTranslations } from "next-intl";
import { BusFront, CarTaxiFront } from "lucide-react";
import {
  formatBusTime,
  isEarlyLastBus,
  type SpotTransit,
} from "@/lib/transit-format";

/**
 * 인근 정류장·막차 한 줄 표시 (코스 카드용).
 * 정류장이 없으면 '택시 권장'으로 안내한다 — 대전 야간 명소 42곳 중 4곳이 이 경우.
 */
export function TransitLine({ transit }: { transit: SpotTransit | null }) {
  const t = useTranslations("transit");
  if (!transit) return null;

  if (!transit.nodeName || !transit.lastBus) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
        <CarTaxiFront size={11} />
        {t("noStop")}
      </span>
    );
  }

  // 막차가 22시 이전이면 더 눈에 띄게 (일찍 끊기는 노선 경고)
  const early = isEarlyLastBus(transit.lastBus);
  return (
    <span
      className={`flex items-center gap-1 text-[11px] font-medium ${
        early ? "text-rose-300" : "text-slate-400"
      }`}
    >
      <BusFront size={11} />
      {t("stopAndLast", {
        stop: transit.nodeName,
        time: formatBusTime(transit.lastBus),
      })}
    </span>
  );
}

/** 스팟 상세용 카드 — 정류장 + 경유노선별 막차·배차간격 */
export function TransitCard({ transit }: { transit: SpotTransit | null }) {
  const t = useTranslations("transit");
  if (!transit) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
        <BusFront size={15} className="text-amber-300" />
        {t("title")}
      </h2>

      {!transit.nodeName ? (
        <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-slate-400">
          <CarTaxiFront size={14} className="mt-0.5 shrink-0 text-slate-500" />
          {t("noStopDetail")}
        </p>
      ) : (
        <>
          <p className="mt-2 text-[13px] text-slate-300">
            {t("nearestStop", {
              stop: transit.nodeName,
              distance: transit.distanceM ?? 0,
            })}
          </p>

          {transit.routes.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {transit.routes.map((r) => (
                <li
                  key={r.routeNo}
                  className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]"
                >
                  <span className="rounded-md bg-amber-300/15 px-2 py-0.5 text-[12px] font-bold text-amber-300">
                    {r.routeNo}
                  </span>
                  <span className="text-slate-200">
                    {t("lastBus", { time: formatBusTime(r.lastTime) })}
                  </span>
                  {r.intervalMin && (
                    <span className="text-slate-500">
                      {t("interval", { min: r.intervalMin })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-slate-600">{t("dataNote")}</p>
        </>
      )}
    </section>
  );
}
