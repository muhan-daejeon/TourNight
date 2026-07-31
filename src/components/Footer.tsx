import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
      {t("notice")}
    </footer>
  );
}
