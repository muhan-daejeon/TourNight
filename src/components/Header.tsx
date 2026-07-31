import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";

export default function Header() {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          🌙 {t("site.title")}
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-300 sm:flex">
          <Link href="/" className="hover:text-white">
            {t("nav.spots")}
          </Link>
          <span className="cursor-not-allowed text-slate-600">
            {t("nav.courses")}
          </span>
          <Link href="/etiquette" className="hover:text-white">
            {t("nav.etiquette")}
          </Link>
          <span className="cursor-not-allowed text-slate-600">
            {t("nav.community")}
          </span>
        </nav>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
