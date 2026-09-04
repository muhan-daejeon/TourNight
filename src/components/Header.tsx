"use client";

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Menu, Search, X } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { markAppCommitted } from "@/lib/app-boot";
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
  { href: "/stamp-tour", key: "stampTour" },
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

/** 상단에 늘 보이는 4개 카테고리와 그 아래 묶인 탭들 — 홈은 좌측 로고가 대신한다.
 * 순서가 MENU_ICONS와 1:1로 짝지어지므로(첫 번째 = menu1 …) 순서를 바꾸면
 * 아이콘도 같이 밀린다 */
const MENU_GROUPS = [
  { id: "explore", labelKey: "groupExplore", items: ["spots", "festivals", "courses"] },
  // 성향 테스트는 놀이가 아니라 여행 준비 도구라 가이드 쪽에 둔다
  { id: "guide", labelKey: "groupGuide", items: ["personality", "etiquette", "phrases"] },
  { id: "local", labelKey: "groupLocal", items: ["food", "stay", "shopping"] },
  { id: "community", labelKey: "groupCommunity", items: ["community", "stampTour"] },
] as const;

/** 카테고리에 마우스를 올렸을 때 왼쪽에 뜨는 마스코트 아이콘 — MENU_GROUPS와 같은 순서 */
const MENU_ICONS = [
  "/menu-icons/menu1.png",
  "/menu-icons/menu2.png",
  "/menu-icons/menu3.png",
  "/menu-icons/menu4.png",
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
  // 마우스가 있는 기기(hover 가능)에서는 카테고리에 포인터만 올려도 메뉴가
  // 열린다 — 클릭해야만 열리는 건 탐색이 번거롭다는 피드백. 터치 기기는
  // mouseenter가 탭과 뒤섞여 오작동하므로 기존 클릭 토글을 유지한다
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setCanHover(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const [searchOpen, setSearchOpen] = useState(false);
  // lg 미만에서는 가로로 늘어놓던 4개 카테고리 대신 햄버거 버튼 하나만 두고,
  // 누르면 4개 그룹을 큰제목+작은글씨 목록으로 세로로 펼친다
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  // 버튼이 아니라 그 바깥(호버 밀림의 영향을 안 받는) div를 담는다 — 아래 렌더 참고
  const btnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  // 마우스가 nav→패널 사이 빈틈을 지날 때 바로 닫히지 않도록 살짝 늦춰 닫는다
  const closeTimerRef = useRef<number | null>(null);

  const openMenu = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMenuOpen(true);
  };
  const scheduleCloseMenu = () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setMenuOpen(false);
    }, 150);
  };

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
    // 호버로 밀려 있던 카테고리를 클릭해 열었다면, 그 순간엔 아직 밀린 자리
    // 그대로 잰다(밀림이 꺼지는 트랜지션이 막 시작된 참이라). 트랜지션이
    // 끝날 때쯤 한 번 더 재서, 제자리로 돌아온 버튼 밑에 다시 맞춘다
    const settle = window.setTimeout(align, 220);
    window.addEventListener("resize", align);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("resize", align);
    };
  }, [menuOpen]);

  // 로고+카테고리 행의 실제 높이를 --header-row-h로 남긴다. 그 위에 행 높이의
  // 절반만큼 여백을 두므로(아래 스페이서), 헤더 전체 높이(--header-h — 홈
  // 히어로 높이·헤더 위 여백 계산에 쓰인다)는 행 높이의 1.5배가 된다
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const set = () => {
      const rowH = el.offsetHeight;
      document.documentElement.style.setProperty("--header-row-h", `${rowH}px`);
      document.documentElement.style.setProperty("--header-h", `${rowH * 1.5}px`);
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 헤더는 모든 페이지에 있다 — 이 문서에서 뭔가 한 번 커밋됐다는 표시를 여기서
  // 남긴다. IntroSequence가 "이 문서를 정말 처음 여는 순간인지"를 판단하는 데
  // 쓴다 (자세한 이유는 lib/app-boot.ts 참고)
  useEffect(() => {
    markAppCommitted();
  }, []);

  // 닫힘 지연 타이머가 언마운트 뒤까지 살아남지 않게 정리한다
  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  // 페이지를 옮기면 열려 있던 카테고리·검색창은 닫는다. 효과가 아니라 렌더 중에
  // 정리하는 이유는, 효과로 하면 이전 경로의 열린 목록이 한 프레임 깜빡이기 때문
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
    setMobileMenuOpen(false);
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
    <header
      className="sticky top-0 z-[56] border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-md"
      // 호버로 연 메뉴는 헤더(패널 포함) 밖으로 마우스가 나가면 닫는다
      onMouseLeave={() => canHover && setMenuOpen(false)}
    >
      <Suspense fallback={null}>
        <TourMenuSync onChange={setTourTarget} />
      </Suspense>
      {/* 로고·메뉴 줄이 화면 맨 위에 바로 붙어 답답해 보인다는 요청 — 줄
          높이의 절반만큼 여백을 둔다. 헤더 자체(스크롤에도 늘 보이는
          sticky) 안에 두므로 스크롤해도 이 여백이 유지된다 */}
      <div aria-hidden style={{ height: "calc(var(--header-row-h, 0px) / 2)" }} />
      <div ref={rowRef} className="relative flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:flex-nowrap lg:px-6">
        {/* 브랜드 워드마크는 번역하지 않는다 — 로고이자 서비스 고유명 */}
        <Link href="/" className="flex shrink-0 flex-col leading-none xl:ml-10">
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
            무관하게 가운데 온다. 각각 누르면 바로 밑에 세로로 탭이 펼쳐진다.
            lg 미만에서는 아예 안 보인다 — 그 화면폭에서는 이 줄 대신 햄버거
            버튼 하나 + 세로 목록 패널(아래 mobileMenuOpen)로 완전히 갈아탄다 */}
        <nav
          onMouseEnter={openMenu}
          onMouseLeave={scheduleCloseMenu}
          className="hidden lg:absolute lg:left-1/2 lg:top-1/2 lg:flex lg:-translate-x-1/2 lg:-translate-y-1/2 lg:flex-nowrap lg:gap-x-40 lg:gap-y-3"
        >
          {MENU_GROUPS.map((group, i) => {
            const groupActive = group.items.some((key) => isActive(findNavItem(key).href));
            const isTourTarget = tourTarget?.groupId === group.id;
            const dimmedByTour = !!tourTarget && !isTourTarget;

            return (
              <div
                key={group.id}
                ref={(el) => {
                  btnRefs.current[group.id] = el;
                }}
                className="flex items-center gap-2"
              >
                {/* 마우스를 올리면 이 카테고리만 오른쪽으로 밀리면서 왼쪽에
                    마스코트 아이콘이 드러난다. 아이콘은 absolute라 폭이
                    0→28px로 바뀌어도 이 안의 어떤 레이아웃도 넓어지지 않는다
                    — 처음엔 폭 변화(w-0→w-7)로 만들었는데, 그러면 4개 메뉴를
                    담은 nav가 justify-center라 아이콘 하나 넓어질 때마다
                    "메뉴 전체 폭"이 바뀌어서 4개 메뉴 전부가 재중앙 정렬되며
                    옆으로 밀렸다(호버 안 한 메뉴까지도!). absolute로 폭 변화를
                    없애 nav의 전체 폭 자체가 호버와 무관하게 늘 같게 만들어
                    막는다. 메뉴가 열려 있을 때는 밀림(translate)을 끈다 —
                    안 그러면 클릭 순간 마우스가 아직 버튼 위에 있어(=계속
                    hover 상태라) 드롭다운 칸(btnRefs로 잰 위치)이 버튼 자리와
                    순간 어긋나 보인다. btnRefs는 버튼이 아니라 이 바깥 div를
                    잰다 — translate는 자기 좌표만 바꾸고 부모 위치엔 영향이
                    없어 이중으로 안전하다 */}
                <div
                  className={`group relative flex items-center transition-transform duration-200 ${
                    menuOpen ? "" : "hover:translate-x-[8px]"
                  }`}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-full top-1/2 mr-1.5 h-7 w-7 -translate-y-1/2 scale-75 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100"
                  >
                    <Image
                      src={MENU_ICONS[i]}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                  </span>
                  <button
                    type="button"
                    // hover 기기: 포인터를 올리면 열리고(아래 onMouseEnter) 클릭은
                    // 열림 유지만 한다 — 토글이면 '올려서 열림→클릭→닫힘'이 된다.
                    // 터치 기기: 기존대로 탭이 토글.
                    onClick={() => setMenuOpen((v) => (canHover ? true : !v))}
                    onMouseEnter={() => canHover && setMenuOpen(true)}
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
                </div>

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

        {/* nav는 absolute + left-1/2로 화면 중앙에 스스로 고정되지, 이 그룹의
            폭과는 무관하다 — 그러니 ml-auto는 모든 폭에서 그대로 둬야
            이 그룹이 계속 오른쪽 끝에 붙는다. xl 이상에서 ml-auto를 껐더니
            이 그룹 전체가 로고 바로 옆(왼쪽)으로 붙어버리는 회귀가 있었다 */}
        <div className="ml-auto flex shrink-0 items-center gap-3 xl:mr-6 2xl:mr-10">
          {/* 콜라주 만들기(꿈돌이와 한컷)는 도장투어 with 꿈돌이 페이지 하단으로
              옮겼다 — 자유 업로드 대신 도장 4개를 다 찍은 사진으로 채우는
              방식으로 바뀌었다. 여기 있던 카메라 버튼은 그래서 없앤다 */}
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
          {/* lg 미만 전용 — 위 4개 카테고리 nav 대신 이 버튼 하나로 메뉴 전체를 연다 */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={t("nav.menu")}
            aria-expanded={mobileMenuOpen}
            className="rounded-full p-2 text-slate-300 transition hover:bg-white/5 hover:text-white lg:hidden"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          ref={panelRef}
          onMouseEnter={openMenu}
          onMouseLeave={scheduleCloseMenu}
          className="absolute inset-x-0 top-full z-40 overflow-hidden border-t border-white/10 bg-slate-950"
        >
          {/* 메뉴 칸은 가운데 쪽에 몰려 있어 패널 양옆이 비는데, 그 자리를
              채우는 장식 — 실제 메뉴 폭이 넓어지는 lg 이상에서만 보인다.
              꿈돌X꿈순은 패널 밑면에 딱 붙이고, 우주선 꿈돌이는 왼쪽 가운데에
              크게 둔다 */}
          <Image
            src="/menu-panel/ggumdol-ggumsun.png"
            alt=""
            width={480}
            height={226}
            className="pointer-events-none absolute bottom-0 right-[calc(1.5rem+15px)] hidden h-auto w-32 object-contain xl:block"
          />
          <Image
            src="/menu-panel/ggumdol-space.png"
            alt=""
            width={560}
            height={418}
            className="pointer-events-none absolute left-[calc(1.5rem+33px)] top-1/2 hidden h-auto w-[11.2rem] -translate-y-1/2 object-contain xl:block"
          />

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
                    {key === "stampTour" ? (
                      // "with 꿈돌이"는 브랜드 문구라 번역하지 않고(위 nav 키 참고),
                      // 메인 메뉴명(text-base)의 0.7배 크기로 작게 붙인다
                      <>
                        {t("nav.stampTour")}{" "}
                        <span className="text-[0.7em]">{t("nav.stampTourWith")}</span>
                      </>
                    ) : (
                      t(`nav.${key}`)
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* lg 미만 전용 — 햄버거를 누르면 4개 그룹을 세로로 쭉 펼친다. 데스크톱
          드롭다운(위 menuOpen 패널)과 달리 버튼 위치를 재서 맞출 필요가 없어
          구조가 훨씬 단순하다. 큰제목(그룹명)은 크고 굵게, 그 아래 작은
          메뉴명들은 작고 가늘게 — 위계가 한눈에 보이게 */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-slate-950 px-5 py-5 lg:hidden">
          {MENU_GROUPS.map((group) => (
            <div key={group.id} className="mb-6 last:mb-0">
              <p className="text-lg font-bold text-white">{t(`nav.${group.labelKey}`)}</p>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {group.items.map((key) => {
                  const item = findNavItem(key);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block text-sm font-light ${linkClass(isActive(item.href))}`}
                    >
                      {key === "stampTour" ? (
                        <>
                          {t("nav.stampTour")}{" "}
                          <span className="text-[0.7em]">{t("nav.stampTourWith")}</span>
                        </>
                      ) : (
                        t(`nav.${key}`)
                      )}
                    </Link>
                  );
                })}
              </div>
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
