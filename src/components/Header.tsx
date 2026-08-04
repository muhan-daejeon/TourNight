"use client";

import { useTranslations } from "next-intl";
import { MoonStar } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";

export default function Header() {
  const t = useTranslations();
  const pathname = usePathname();

  const linkClass = (active: boolean) =>
    `shrink-0 transition ${
      active ? "font-semibold text-amber-300" : "hover:text-amber-300"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-slate-950/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight">
          <MoonStar size={19} className="text-amber-300" />
          <span>{t("site.title")}</span>
        </Link>
        <nav className="flex items-center gap-4 overflow-x-auto text-sm text-slate-300 sm:gap-6">
          <Link
            href="/"
            className={linkClass(pathname === "/" || pathname.startsWith("/spots"))}
          >
            {t("nav.spots")}
          </Link>
          <Link
            href="/etiquette"
            className={linkClass(pathname.startsWith("/etiquette"))}
          >
            {t("nav.etiquette")}
          </Link>
          <span className="shrink-0 cursor-not-allowed text-slate-600">
            {t("nav.courses")}
          </span>
          <Link
            href="/community"
            className={linkClass(pathname.startsWith("/community"))}
          >
            {t("nav.community")}
          </Link>
        </nav>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
