import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-slate-800/70 py-8 text-center">
      <p className="text-sm font-semibold text-slate-400">
        🌙 {t("site.title")} — {t("site.tagline")}
      </p>
      <p className="mt-2 text-xs text-slate-600">{t("footer.notice")}</p>
    </footer>
  );
}
