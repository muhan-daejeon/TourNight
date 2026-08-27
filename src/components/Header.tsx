"use client";

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";
import AuthNav from "./AuthNav";

/** 탭의 href 출처 */
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

/** 상단 카테고리에서 뺐다고 갈 길까지 없애면 주소를 직접 치지 않는 한 못 들어가므로,
 * "로컬 인프라 · 스팟" 그룹 안에 남겨 둔다. */
const MENU_EXTRAS = [
  { href: "/food", key: "food" },
  { href: "/stay", key: "stay" },
  { href: "/shopping", key: "shopping" },
] as const;

/** 상단에 늘 보이는 4개 카테고리와 그 아래 묶인 탭들 — 홈은 좌측 로고가 대신한다 */
const MENU_GROUPS = [
  { id: "explore", labelKey: "groupExplore", items: ["spots", "festivals", "courses"] },
  // 성향 테스트는 놀이가 아니라 여행 준비 도구라 가이드 쪽에 둔다
  { id: "guide", labelKey: "groupGuide", items: ["personality", "etiquette", "phrases"] },
  { id: "local", labelKey: "groupLocal", items: ["food", "stay", "shopping"] },
  { id: "community", labelKey: "groupCommunity", items: ["community"] },
] as const;

function findNavItem(key: string) {
  return [...NAV_ITEMS, ...MENU_EXTRAS].find((item) => item.key === key)!;
}

function isActiveHref(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

interface TourTarget {
  groupId: string;
  itemKey: string;
}

/**
 * 둘러보기 중에는 카테고리를 펼쳐 보여주는 대신(펼치면 그 목록이 화면 위에
 * 그대로 겹쳐 보였다), 그 탭이 속한 카테고리 자체를 노란 테두리로 밝히고
 * 옆에 "— 탭이름"을 노란 글자로 붙인다. 나머지 카테고리는 흐리게 죽인다.
 * useSearchParams는 프리렌더 중 Suspense 경계가 필요해 따로 뺐다.
 */
function TourMenuSync({ onChange }: { onChange: (target: TourTarget | null) => void }) {
  const pathname = usePathname();
  const tourStep = useSearchParams().get("tour");

  useLayoutEffect(() => {
    if (!tourStep) {
      onChange(null);
      return;
    }
    for (const group of MENU_GROUPS) {
      const itemKey = group.items.find(
        (key) => TOUR_KEY[key] && isActiveHref(pathname, findNavItem(key).href),
      );
      if (itemKey) {
        onChange({ groupId: group.id, itemKey });
        return;
      }
    }
    onChange(null);
  }, [tourStep, pathname, onChange]);

  return null;
}

export default function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tourTarget, setTourTarget] = useState<TourTarget | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  // 자식 목록 각각을 그 위 부모 버튼의 실제 가로 중앙에 맞춘다. 부모들은
  // gap-x-20으로 벌어져 있고 자식 목록마다 폭이 달라(커뮤니티는 1개, 야간
  // 탐색은 4개) 같은 간격의 flex로는 절대 안 맞길래, 버튼 위치를 직접 재서
  // 자식 목록에 옮겨 붙인다. absolute로 두는 만큼 패널 높이도 직접 정해 준다
  useLayoutEffect(() => {
    if (!menuOpen) return;
    const align = () => {
      let maxH = 0;
      for (const group of MENU_GROUPS) {
        const btn = btnRefs.current[group.id];
        const col = colRefs.current[group.id];
        if (!btn || !col) continue;
        const r = btn.getBoundingClientRect();
        col.style.left = `${r.left + r.width / 2}px`;
        maxH = Math.max(maxH, col.offsetHeight);
      }
      if (panelRef.current) panelRef.current.style.height = `${maxH + 64}px`;
    };
    align();
    window.addEventListener("resize", align);
    return () => window.removeEventListener("resize", align);
  }, [menuOpen]);

  // 로고+카테고리 행의 실제 높이를 --header-h로 남겨, 이 행 위 여백과 슬라이드
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

  // 페이지를 옮기면 열려 있던 카테고리·검색창은 닫는다. 효과가 아니라 렌더 중에
  // 정리하는 이유는, 효과로 하면 이전 경로의 열린 목록이 한 프레임 깜빡이기 때문
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
  const isActive = (href: string) => isActiveHref(pathname, href);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // 검색 UI는 야경명소 탐색기가 갖고 있으므로 질의를 넘겨 그쪽에서 이어 받는다
    router.push(query.trim() ? `/spots?q=${encodeURIComponent(query.trim())}` : "/spots");
  };

  return (
    // 온보딩 투어의 흐림막(z-[55])보다 위에 둔다 — 안 그러면 투어 중 헤더 전체가
    // backdrop-blur에 걸려 부모 메뉴 글자까지 흐릿해진다. 켜져 있지 않을 때도
    // z-50이던 걸 z-[56]으로만 올린 것뿐이라 다른 겹침에는 영향이 없다
    <header className="sticky top-0 z-[56] border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-md">
      <Suspense fallback={null}>
        <TourMenuSync onChange={setTourTarget} />
      </Suspense>
      {/* 로고+카테고리 행 위 여백 — 행 자신의 높이만큼, 스크롤해도 유지된다.
          좁은 화면은 행이 두 줄로 늘어나 이 여백까지 커지므로 두지 않는다 */}
      <div aria-hidden className="hidden lg:block" style={{ height: "var(--header-h, 0px)" }} />
      <div ref={rowRef} className="relative flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:flex-nowrap lg:px-6">
        {/* 브랜드 워드마크는 번역하지 않는다 — 로고이자 서비스 고유명 */}
        <Link href="/" className="flex shrink-0 flex-col leading-none lg:ml-10">
          <span
            data-header-logo
            className="text-[26px] font-extrabold tracking-tight text-white lg:text-[34px]"
          >
            Tour<span className="text-amber-400">Night</span>
          </span>
          <span className="mt-1 text-[10px] tracking-tight text-slate-500">
            {t("site.tagline")}
          </span>
        </Link>

        {/* 4개 카테고리 — 화면 정중앙에 절대 위치시켜 로고·오른쪽 묶음의 폭과
            무관하게 가운데 온다. 각각 누르면 바로 밑에 세로로 탭이 펼쳐진다 */}
        <nav className="order-last flex basis-full flex-wrap items-center justify-center gap-x-5 gap-y-2 lg:absolute lg:left-1/2 lg:top-1/2 lg:order-none lg:basis-auto lg:-translate-x-1/2 lg:-translate-y-1/2 lg:gap-x-20 lg:gap-y-3">
          {MENU_GROUPS.map((group) => {
            const groupActive = group.items.some((key) => isActive(findNavItem(key).href));
            const isTourTarget = tourTarget?.groupId === group.id;
            const dimmedByTour = !!tourTarget && !isTourTarget;

            return (
              <div key={group.id} className="flex items-center gap-2">
                <button
                  ref={(el) => {
                    btnRefs.current[group.id] = el;
                  }}
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  className={`whitespace-nowrap text-base tracking-wide transition ${
                    isTourTarget
                      ? "rounded-lg border-2 border-amber-400 px-3 py-1 font-semibold text-amber-300"
                      : dimmedByTour
                        ? "font-light text-slate-600"
                        : groupActive
                          ? "font-light text-amber-300"
                          : "font-light text-slate-200 hover:text-amber-300"
                  }`}
                >
                  {t(`nav.${group.labelKey}`)}
                </button>

                {/* 둘러보기 중엔 그 카테고리 오른쪽에 "— 탭이름"을 작은 노란 글자로 붙인다.
                    data-tour-target은 테스트 전용 표식이다 — OnboardingTour의 링 표시는
                    [data-tour-nav]만 찾으므로 이름을 다르게 둬 여기엔 테두리가 안 붙는다 */}
                {isTourTarget && (
                  <span
                    data-tour-target={TOUR_KEY[tourTarget.itemKey]}
                    className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-light text-amber-300"
                  >
                    <span aria-hidden>—</span>
                    {t(`nav.${tourTarget.itemKey}`)}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3 lg:mr-20">
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

      {menuOpen && (
        <div
          ref={panelRef}
          className="absolute inset-x-0 top-full z-40 overflow-hidden border-t border-white/10 bg-slate-950"
        >
          {/* 부모 이름은 되풀이하지 않는다 — 각 목록을 그 위 부모 버튼의 실제
              가로 중앙에 맞춰 옮겨 붙이므로 어느 부모 것인지는 위치로 보인다 */}
          {MENU_GROUPS.map((group) => (
            <div
              key={group.id}
              ref={(el) => {
                colRefs.current[group.id] = el;
              }}
              className="absolute top-8 flex -translate-x-1/2 flex-col items-center gap-1"
            >
              {group.items.map((key) => {
                const item = findNavItem(key);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-lg px-2 py-1.5 text-center text-base transition ${linkClass(isActive(item.href))}`}
                  >
                    {t(`nav.${key}`)}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}

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
    </header>
  );
}
