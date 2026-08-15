"use client";

import { useTranslations } from "next-intl";
import { MoonStar } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";
import AuthNav from "./AuthNav";

/** 상단 탭 — 순서가 곧 정보 구조다 (명소 → 축제 → 코스 → 커뮤니티 → 가이드) */
const NAV_ITEMS = [
  { href: "/spots", key: "spots" },
  { href: "/festivals", key: "festivals" },
  { href: "/courses", key: "courses" },
  { href: "/community", key: "community" },
  { href: "/etiquette", key: "etiquette" },
  { href: "/phrases", key: "phrases" },
] as const;

export default function Header() {
  const t = useTranslations();
  const pathname = usePathname();

  const linkClass = (active: boolean) =>
    `shrink-0 transition ${
      active ? "font-semibold text-amber-300" : "hover:text-amber-300"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-slate-950/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="flex shrink-0 flex-col leading-none"
        >
          <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <MoonStar size={19} className="text-amber-300" />
            {t("site.title")}
          </span>
          <span className="mt-1 hidden pl-[27px] text-[10px] text-slate-500 sm:block">
            {t("site.tagline")}
          </span>
        </Link>
        {/* 홈은 로고가 담당하고, 탭은 각 주제 페이지로만 간다 */}
        <nav className="flex items-center gap-4 overflow-x-auto text-sm text-slate-300 sm:gap-5">
          {NAV_ITEMS.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              className={linkClass(pathname.startsWith(href))}
            >
              {t(`nav.${key}`)}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <AuthNav />
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
