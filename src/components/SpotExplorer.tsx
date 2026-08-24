"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Telescope,
  Trees,
  Sparkles,
  Building2,
  Bookmark,
  ChevronRight,
  Search,
  Route,
  Plus,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import type { NightSpot } from "@/lib/kto";
import NightMap from "./NightMap";
import { useBookmarks } from "./useBookmarks";

const CATEGORIES = ["all", "science", "nature", "festival", "city"] as const;

const CATEGORY_ICON: Record<string, LucideIcon> = {
  science: Telescope,
  nature: Trees,
  festival: Sparkles,
  city: Building2,
};

const CATEGORY_TEXT: Record<string, string> = {
  science: "text-sky-300",
  nature: "text-emerald-300",
  festival: "text-pink-300",
  city: "text-amber-300",
};

/** 이미지가 없을 때 쓰는 카테고리별 야간 그라데이션 썸네일 */
const CATEGORY_SCENE: Record<string, string> = {
  science: "from-sky-950 via-slate-900 to-cyan-950",
  nature: "from-emerald-950 via-slate-900 to-teal-950",
  festival: "from-fuchsia-950 via-slate-900 to-rose-950",
  city: "from-amber-950 via-slate-900 to-orange-950",
};

export default function SpotExplorer({ spots }: { spots: NightSpot[] }) {
  const t = useTranslations("home");
  const router = useRouter();
  const [category, setCategory] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { ids: bookmarks, toggle: toggleBookmark } = useBookmarks();
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  // 헤더 검색이 /spots?q=…로 넘어온다. 사용자가 여기서 다시 치면 그 값이 이기고,
  // 헤더에서 새로 검색해 URL이 바뀌면 다시 URL을 따라간다.
  const urlQuery = useSearchParams().get("q") ?? "";
  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  if (seenUrlQuery !== urlQuery) {
    setSeenUrlQuery(urlQuery);
    setTypedQuery(null);
  }
  const query = typedQuery ?? urlQuery;
  const setQuery = setTypedQuery;
  // 코스에 담은 명소들 — 담긴 곳을 전부 거치는 AI 코스를 짠다 (최대 4곳)
  const MAX_BASKET = 4;
  const [basket, setBasket] = useState<string[]>([]);

  // '담기'가 코스 만들기의 시작이라는 걸 처음 온 사람은 알 수 없다 → 3단계로 알려준다.
  // 한 번 닫았거나 이미 담아 본 사람에게는 다시 띄우지 않는다
  const HOWTO_KEY = "tournight:howto:basket";
  const [showHowTo, setShowHowTo] = useState(false);
  useEffect(() => {
    // 서버 HTML과 어긋나지 않도록 그린 뒤에 읽는다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowHowTo(localStorage.getItem(HOWTO_KEY) !== "done");
  }, []);
  const closeHowTo = () => {
    localStorage.setItem(HOWTO_KEY, "done");
    setShowHowTo(false);
  };

  const toggleBasket = (contentId: string) => {
    closeHowTo();
    setBasket((prev) =>
      prev.includes(contentId)
        ? prev.filter((id) => id !== contentId)
        : prev.length >= MAX_BASKET
          ? prev
          : [...prev, contentId],
    );
  };

  const planCourse = (ids: string[]) =>
    router.push(
      `/courses?from=${encodeURIComponent(ids.join(","))}` +
        (category === "all" ? "" : `&category=${category}`),
    );

  // 카테고리 + 텍스트(이름·주소) 동시 필터
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return spots.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (onlyBookmarked && !bookmarks.includes(s.contentId)) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        (s.addr ?? "").toLowerCase().includes(q)
      );
    });
  }, [spots, category, query, onlyBookmarked, bookmarks]);

  // 지도 마커 표시 여부 판단용 — 현재 필터를 통과한 스팟 ID 집합
  const visibleIds = useMemo(
    () => new Set(filtered.map((s) => s.contentId)),
    [filtered],
  );

  // 선택된 스팟이 필터에서 빠지면 지도에 전달하지 않음 (오버레이 잔상 방지)
  const activeSelectedId =
    selectedId && visibleIds.has(selectedId) ? selectedId : null;

  const steps = ["howToStep1", "howToStep2", "howToStep3"] as const;

  return (
    <div>
      {/* 코스 만드는 법 — 처음 온 사람을 위한 3단계 안내 */}
      {showHowTo && (
        <div className="relative mb-4 overflow-hidden rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-5 py-4">
          <p className="flex items-center gap-2 pr-8 text-sm font-bold text-amber-300">
            <Route size={16} />
            {t("howToTitle")}
          </p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-3">
            {steps.map((key, i) => (
              <li key={key} className="flex items-start gap-2">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-extrabold text-slate-950">
                  {i + 1}
                </span>
                <span className="text-[13px] leading-snug text-slate-300">
                  {t.rich(key, {
                    b: (c) => <b className="font-bold text-white">{c}</b>,
                  })}
                </span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={closeHowTo}
            aria-label={t("howToClose")}
            className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 검색창 */}
      <div className="relative mb-3">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 backdrop-blur transition focus:border-amber-400/60 focus:bg-white/[0.07] focus:outline-none"
        />
      </div>

      {/* 카테고리 필터 칩 (스팟이 있는 카테고리만 노출) */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.filter(
          (c) => c === "all" || spots.some((s) => s.category === c),
        ).map((c) => {
          const Icon = c === "all" ? null : CATEGORY_ICON[c];
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                category === c
                  ? "border-amber-400 bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.3)]"
                  : "border-white/10 bg-white/5 text-slate-300 backdrop-blur hover:border-white/25 hover:text-white"
              }`}
            >
              {Icon && <Icon size={14} strokeWidth={2.2} />}
              {t(`categories.${c}`)}
            </button>
          );
        })}
        {/* 찜한 곳만 — 하나도 없으면 눌러도 빈 목록이라 아예 띄우지 않는다 */}
        {bookmarks.length > 0 && (
          <button
            onClick={() => setOnlyBookmarked((v) => !v)}
            aria-pressed={onlyBookmarked}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              onlyBookmarked
                ? "border-amber-400 bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.3)]"
                : "border-white/10 bg-white/5 text-slate-300 backdrop-blur hover:border-white/25 hover:text-white"
            }`}
          >
            <Bookmark
              size={14}
              strokeWidth={2.2}
              fill={onlyBookmarked ? "currentColor" : "none"}
            />
            {t("bookmarkFilter", { count: bookmarks.length })}
          </button>
        )}
      </div>

      {/* 리스트 + 고정 지도 분할 뷰 */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_560px]">
        {/* 사진 카드가 커진 만큼 2열로 배치해 스크롤 길이를 유지한다.
            content-start가 없으면 스팟이 적은 카테고리에서 카드가 옆 지도 높이만큼
            늘어나 사진 아래에 빈 공간이 생긴다 */}
        <div className="order-2 grid content-start items-start gap-3 sm:grid-cols-2 lg:order-1">
          {filtered.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-slate-500 sm:col-span-2">
              {t("noResults")}
            </p>
          )}
          {filtered.map((spot) => {
            const Icon = CATEGORY_ICON[spot.category];
            return (
              <article
                key={spot.contentId}
                onClick={() => setSelectedId(spot.contentId)}
                className={`glass-card group cursor-pointer overflow-hidden rounded-2xl ${
                  selectedId === spot.contentId
                    ? "!border-amber-400/60 !bg-amber-400/5"
                    : ""
                }`}
              >
                {/* 사진 우선 카드 — 야경 사진이 주인공, 텍스트는 사진 위에 얹는다 */}
                <div
                  className={`relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br sm:h-52 ${CATEGORY_SCENE[spot.category]}`}
                >
                  {spot.imageUrl ? (
                    <Image
                      src={spot.imageUrl}
                      alt={spot.title}
                      fill
                      sizes="(min-width: 1024px) 40vw, 100vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <Icon
                      size={40}
                      strokeWidth={1.2}
                      className="text-white/20"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />

                  <span
                    className={`absolute left-3 top-3 flex items-center gap-1 rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold backdrop-blur ${CATEGORY_TEXT[spot.category]}`}
                  >
                    <Icon size={11} strokeWidth={2.4} />
                    {t(`categories.${spot.category}`)}
                  </span>

                  {/* 찜 — 브라우저에만 저장되고, 위 '찜한 곳' 칩으로 다시 찾는다 */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(spot.contentId);
                    }}
                    aria-pressed={bookmarks.includes(spot.contentId)}
                    aria-label={
                      bookmarks.includes(spot.contentId)
                        ? t("bookmarkRemove")
                        : t("bookmarkAdd")
                    }
                    className={`absolute right-3 top-11 rounded-full p-1.5 backdrop-blur transition ${
                      bookmarks.includes(spot.contentId)
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-950/70 text-slate-200 hover:bg-slate-950/90 hover:text-amber-300"
                    }`}
                  >
                    <Bookmark
                      size={13}
                      fill={
                        bookmarks.includes(spot.contentId)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>

                  {/* 코스에 담기 — 담긴 곳들을 전부 거치는 AI 코스를 짤 수 있다 */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBasket(spot.contentId);
                    }}
                    aria-label={
                      basket.includes(spot.contentId)
                        ? t("basketRemove")
                        : t("basketAdd")
                    }
                    className={`absolute right-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur transition ${
                      basket.includes(spot.contentId)
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-950/70 text-slate-200 hover:bg-slate-950/90 hover:text-amber-300"
                    }`}
                  >
                    {basket.includes(spot.contentId) ? (
                      <Check size={12} strokeWidth={3} />
                    ) : (
                      <Plus size={12} strokeWidth={3} />
                    )}
                    {basket.includes(spot.contentId)
                      ? t("basketAdded")
                      : t("basketAdd")}
                  </button>

                  <div className="absolute inset-x-0 bottom-0 flex items-end gap-2 p-3.5">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] group-hover:text-amber-300">
                        {spot.title}
                      </h3>
                      <p className="truncate text-[13px] text-slate-300">
                        {spot.addr}
                      </p>
                    </div>
                    <Link
                      href={`/spots/${spot.contentId}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={spot.title}
                      className="shrink-0 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-amber-400 hover:text-slate-950"
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="order-1 h-80 lg:order-2 lg:sticky lg:top-20 lg:h-[620px]">
          <NightMap
            spots={spots}
            visibleIds={visibleIds}
            selectedId={activeSelectedId}
            onSelect={setSelectedId}
            // 코스 페이지에서 이 스팟을 거치는 AI 코스를 만들어 추천 코스와 함께 보여준다.
            // 켜둔 카테고리 필터도 넘겨 같은 계열 명소를 우선하게 한다 (강제는 아님)
            onPlanCourse={(contentId) => planCourse([contentId])}
          />
        </div>
      </div>

      {/* 담은 명소 바 — 2곳 이상 담으면 그 조합으로 코스를 짤 수 있다 */}
      {basket.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 px-4">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/90 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur">
            {basket.map((id) => {
              const spot = spots.find((s) => s.contentId === id);
              if (!spot) return null;
              return (
                <span
                  key={id}
                  className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 py-1 pl-3 pr-1.5 text-[13px] font-semibold text-slate-100"
                >
                  {spot.title}
                  <button
                    type="button"
                    onClick={() => toggleBasket(id)}
                    aria-label={t("basketRemove")}
                    className="rounded-full p-0.5 text-slate-500 transition hover:bg-white/10 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                </span>
              );
            })}
            {basket.length >= MAX_BASKET ? (
              <span className="text-[11px] text-slate-500">
                {t("basketMax", { max: MAX_BASKET })}
              </span>
            ) : basket.length === 1 ? (
              <span className="text-[11px] text-slate-500">
                {t("basketOne")}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => planCourse(basket)}
              className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
            >
              <Sparkles size={14} />
              {t("basketPlan", { count: basket.length })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
