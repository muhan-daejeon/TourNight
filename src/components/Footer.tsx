import { useTranslations } from "next-intl";
import { MoonStar } from "lucide-react";

export default function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-white/[0.06] py-8 text-center">
      {/* 긴급 연락처 — 전 페이지 상시 노출 (외국인 야간 안전) */}
      <p className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="font-bold text-amber-300/80">{t("etiquette.emergency.title")}</span>
        <span><b className="text-slate-300">112</b> {t("etiquette.emergency.police")}</span>
        <span><b className="text-slate-300">119</b> {t("etiquette.emergency.fire")}</span>
        <span><b className="text-slate-300">1330</b> {t("etiquette.emergency.hotline")}</span>
      </p>
      <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-400">
        <MoonStar size={14} className="text-amber-300/70" />
        {t("site.title")} — {t("site.tagline")}
      </p>
      <p className="mt-2 text-xs text-slate-600">{t("footer.notice")}</p>
      {/* 공공누리 1유형 출처표시 의무 이행 */}
      <p className="mt-1.5 text-[11px] text-slate-700">
        Photos: 대전광역시 (공공누리 제1유형) · Wikimedia Commons (CC0 · CC BY 2.0
        · CC BY 3.0 · CC BY-SA 2.0 · CC BY-SA 4.0 © Minseong Kim, Rickinasia,
        Twotwo2019, Ryuch, superlocal, ccfarmer, lazy fri13th, KOREA.NET)
      </p>
    </footer>
  );
}
