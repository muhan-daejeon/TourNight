import { useTranslations } from "next-intl";
import { MoonStar } from "lucide-react";

export default function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-white/[0.06] py-8 text-center">
      <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-400">
        <MoonStar size={14} className="text-amber-300/70" />
        {t("site.title")} — {t("site.tagline")}
      </p>
      <p className="mt-2 text-xs text-slate-600">{t("footer.notice")}</p>
    </footer>
  );
}
