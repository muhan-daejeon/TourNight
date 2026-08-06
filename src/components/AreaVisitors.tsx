import { getLocale, getTranslations } from "next-intl/server";
import { UsersRound } from "lucide-react";
import { getAreaVisitors } from "@/lib/visitors";

const INTL_LOCALE: Record<string, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
};

/** 스팟이 속한 구의 실제 방문객 규모 (KTO 빅데이터) — 데이터 없으면 렌더 안 함 */
export default async function AreaVisitors({ addr }: { addr: string }) {
  const v = await getAreaVisitors(addr);
  if (!v) return null;
  const t = await getTranslations("spot.areaVisitors");
  const locale = await getLocale();
  const count = new Intl.NumberFormat(INTL_LOCALE[locale] ?? "en-US").format(
    v.dailyAvg,
  );

  return (
    <p className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-slate-300 backdrop-blur">
      <UsersRound size={15} className="shrink-0 text-amber-300" />
      {t("line", { gu: v.gu, count })}
      <span className="text-xs text-slate-500">
        {t("basis", { month: v.basisMonth })}
      </span>
    </p>
  );
}
