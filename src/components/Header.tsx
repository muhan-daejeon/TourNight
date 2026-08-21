"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, Search, X } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";
import AuthNav from "./AuthNav";

/** 상단 탭 */
const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/spots", key: "spots" },
  { href: "/personality", key: "personality" },
  { href: "/etiquette", key: "etiquette" },
  { href: "/phrases", key: "phrases" },
  { href: "/courses", key: "courses" },
  { href: "/community", key: "community" },
] as const;

/**
 * 둘러보기 단계와 짝지어지는 탭. 단계마다 탭 하나씩 1:1로 맞춘다.
 *
 * 전에는 에티켓 단계가 회화 탭까지 함께 밝혔는데, 설명은 매너 얘기만 하면서
 * 테두리는 두 곳에 쳐져 무엇을 보라는 건지 어긋났다. 회화는 별도 단계로 뺐다.
 */
const TOUR_KEY: Record<string, string> = {
  spots: "spots",
  courses: "courses",
  etiquette: "etiquette",
  phrases: "phrases",
  community: "community",
};

/**
 * 전체 메뉴에만 두는 항목. 상단에서 뺐다고 갈 길까지 없애면 주소를 직접 치지
 * 않는 한 못 들어가므로, 여기에 남겨 둔다.
 */
const MENU_EXTRAS = [
  { href: "/festivals", key: "festivals" },
  { href: "/food", key: "food" },
  { href: "/stay", key: "stay" },
  { href: "/shopping", key: "shopping" },
] as const;

export default function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // 페이지를 옮기면 열려 있던 메뉴·검색창은 닫는다. 효과가 아니라 렌더 중에
  // 정리하는 이유는, 효과로 하면 이전 경로의 열린 메뉴가 한 프레임 깜빡이기 때문
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  const linkClass = (active: boolean) =>
    `shrink-0 transition ${
      active ? "font-semibold text-amber-300" : "hover:text-amber-300"
    }`;

  // "/"는 startsWith로 보면 모든 경로에 걸리므로 정확히 일치할 때만 현재 탭이다
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // 검색 UI는 야경명소 탐색기가 갖고 있으므로 질의를 넘겨 그쪽에서 이어 받는다
    router.push(query.trim() ? `/spots?q=${encodeURIComponent(query.trim())}` : "/spots");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        {/* 브랜드 워드마크는 번역하지 않는다 — 로고이자 서비스 고유명 */}
        <Link href="/" className="flex shrink-0 flex-col leading-none">
          <span className="text-[17px] font-extrabold tracking-tight text-white">
            Tour<span className="text-indigo-400">Night</span>
          </span>
          <span className="mt-1 text-[10px] tracking-tight text-slate-500">
            {t("site.tagline")}
          </span>
        </Link>

        <nav className="mx-auto hidden items-center gap-6 text-sm text-slate-300 lg:flex">
          {NAV_ITEMS.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              // 둘러보기에서 이 탭도 함께 밝힌다 (어느 메뉴 얘기인지 보이도록)
              data-tour-nav={TOUR_KEY[key]}
              className={linkClass(isActive(href))}
            >
              {t(`nav.${key}`)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          {/* 시안에는 없지만 전 페이지가 로그인 필요라 로그아웃 경로가 늘 보여야 한다.
              좁은 화면에서는 자리가 없어 햄버거 메뉴 안으로 들어간다 */}
          <div className="hidden lg:block">
            <AuthNav />
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchOpen((v) => !v);
              // 열릴 때 바로 입력할 수 있게 — 렌더 다음 틱에 포커스
              requestAnimationFrame(() => searchRef.current?.focus());
            }}
            aria-label={t("home.searchPlaceholder")}
            aria-expanded={searchOpen}
            className="rounded-full p-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <Search size={18} />
          </button>
          <LocaleSwitcher />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t("nav.menu")}
            aria-expanded={menuOpen}
            className="rounded-full p-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <form
          onSubmit={submitSearch}
          className="border-t border-white/[0.06] bg-slate-950/95"
        >
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
            <Search size={16} className="shrink-0 text-slate-500" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("home.searchPlaceholder")}
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-amber-400 px-4 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-300"
            >
              {t("etiquette.searchButton")}
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label={t("community.photoClose")}
              className="shrink-0 rounded-full p-1.5 text-slate-500 transition hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </form>
      )}

      {menuOpen && (
        <div className="border-t border-white/[0.06] bg-slate-950/95">
          <div className="mx-auto max-w-6xl px-4 py-4">
            <nav className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-slate-300 sm:grid-cols-3">
              {[...NAV_ITEMS, ...MENU_EXTRAS].map(({ href, key }) => (
                <Link
                  key={href}
                  href={href}
                  className={linkClass(isActive(href))}
                >
                  {t(`nav.${key}`)}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex items-center justify-end border-t border-white/[0.06] pt-4 lg:hidden">
              <AuthNav />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
