"use client";

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";
import AuthNav from "./AuthNav";

/** MENU를 열면 나오는 탭 (href의 출처) */
const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/spots", key: "spots" },
  { href: "/festivals", key: "festivals" },
  { href: "/courses", key: "courses" },
  { href: "/personality", key: "personality" },
  { href: "/etiquette", key: "etiquette" },
  { href: "/phrases", key: "phrases" },
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

/** 상단 탭에서 뺐다고 갈 길까지 없애면 주소를 직접 치지 않는 한 못 들어가므로,
 * MENU 안에는 남겨 둔다. */
const MENU_EXTRAS = [
  { href: "/food", key: "food" },
  { href: "/stay", key: "stay" },
  { href: "/shopping", key: "shopping" },
] as const;

/** MENU를 열면 보이는 순서 — 홈은 좌측 상단 로고가 대신하므로 뺀다 */
const MENU_ROWS: readonly (readonly string[])[] = [
  ["spots", "festivals", "courses"],
  ["personality", "etiquette", "phrases", "community"],
  ["food", "stay", "shopping"],
];

function findNavItem(key: string) {
  return [...NAV_ITEMS, ...MENU_EXTRAS].find((item) => item.key === key)!;
}

/**
 * MENU가 기본으로 닫혀 있으니, 둘러보기가 헤더 탭을 밝혀야 하는 단계(예: /spots)에
 * 와 있으면 대신 열어 준다 — 안 그러면 하이라이트 대상 자체가 화면에 없다.
 * useSearchParams는 프리렌더 중 Suspense 경계가 필요해 따로 뺐다.
 */
function TourMenuSync({ onNeedOpen }: { onNeedOpen: () => void }) {
  const pathname = usePathname();
  const tourStep = useSearchParams().get("tour");

  useLayoutEffect(() => {
    if (!tourStep) return;
    const active = NAV_ITEMS.some(
      ({ href, key }) =>
        TOUR_KEY[key] && (href === "/" ? pathname === "/" : pathname.startsWith(href)),
    );
    if (active) onNeedOpen();
  }, [tourStep, pathname, onNeedOpen]);

  return null;
}

export default function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // 로고+메뉴 행의 실제 높이를 --header-h로 남겨, 이 행 위 여백과 슬라이드
  // 배너 상단 여백이 실제 헤더 높이에 맞춰 함께 커지고 줄어들게 한다
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const set = () =>
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      <Suspense fallback={null}>
        <TourMenuSync onNeedOpen={() => setMenuOpen(true)} />
      </Suspense>
      {/* 로고+메뉴 행 위 여백 — 행 자신의 높이만큼, 스크롤해도 유지된다 */}
      <div aria-hidden style={{ height: "var(--header-h, 0px)" }} />
      <div ref={rowRef} className="flex w-full items-center gap-4 px-6 py-3">
        {/* 브랜드 워드마크는 번역하지 않는다 — 로고이자 서비스 고유명 */}
        <Link href="/" className="ml-10 flex shrink-0 flex-col leading-none">
          <span
            data-header-logo
            className="text-[34px] font-extrabold tracking-tight text-white"
          >
            Tour<span className="text-amber-400">Night</span>
          </span>
          <span className="mt-1 text-[10px] tracking-tight text-slate-500">
            {t("site.tagline")}
          </span>
        </Link>

        <div className="ml-auto mr-20 flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t("nav.menu")}
            aria-expanded={menuOpen}
            className={`mr-16 text-xs font-bold tracking-[0.2em] transition ${
              menuOpen ? "text-amber-300" : "text-slate-300 hover:text-amber-300"
            }`}
          >
            MENU
          </button>
          <AuthNav />
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
        </div>
      </div>

      {searchOpen && (
        <form
          onSubmit={submitSearch}
          className="border-t border-white/[0.06] bg-slate-950/95"
        >
          <div className="flex w-full items-center gap-2 px-6 py-3">
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

      {/* MENU — 문서 흐름을 밀어내지 않는 오버레이. 거의 다 채운 검정에 가깝게
          (불투명도를 낮추면 오히려 뒤가 비쳐 옅어진다 — 진하게 보이려면 반대로
          높여야 한다) */}
      {menuOpen && (
        <div className="absolute inset-x-0 top-full z-40 border-t border-white/10 bg-slate-950/90">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-10">
            {MENU_ROWS.map((row, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
              >
                {row.map((key) => {
                  const item = findNavItem(key);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      // 둘러보기에서 이 탭도 함께 밝힌다 (어느 메뉴 얘기인지 보이도록)
                      data-tour-nav={TOUR_KEY[key]}
                      className={`text-xl ${linkClass(isActive(item.href))}`}
                    >
                      {t(`nav.${key}`)}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
