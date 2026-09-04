"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Soup,
  Beer,
  CarTaxiFront,
  ShieldAlert,
  Store,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

interface Phrase {
  korean: string;
  roman: string;
  meaning: string;
}

const CATEGORY_IDS = ["food", "bar", "taxi", "help", "store"] as const;

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  food: Soup,
  bar: Beer,
  taxi: CarTaxiFront,
  help: ShieldAlert,
  store: Store,
};

function PhraseRow({ p }: { p: Phrase }) {
  return (
    <li className="flex flex-col gap-0.5 bg-white/[0.02] px-5 py-3">
      <span className="font-semibold text-slate-100">{p.korean}</span>
      <span className="text-xs text-amber-300/80">{p.roman}</span>
      <span className="text-sm text-slate-400">{p.meaning}</span>
    </li>
  );
}

/**
 * 서바이벌 한국어 v2 — 검색 번역 + 상황별 표현집. 한국어 사용자에게는 영어판 미리보기.
 * searchOnly: 상황별 표현이 에티켓 주제 카드 안으로 통합된 뒤로, 에티켓 페이지
 * 하단에서는 상황에 묶이지 않는 자유 검색만 남긴다 — 카테고리 목록까지 두면
 * 같은 표현이 두 군데 중복돼 "두 기능을 쌓아놓은" 화면이 된다.
 */
export default function SurvivalPhrases({ searchOnly = false }: { searchOnly?: boolean }) {
  const t = useTranslations("etiquette");
  const locale = useLocale();
  const effectiveLocale = locale === "ko" ? "en" : locale;

  const [book, setBook] = useState<Record<string, Phrase[]>>({});
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [openCat, setOpenCat] = useState<string>("food");

  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<
    "idle" | "loading" | "error" | "done"
  >("idle");
  const [searchResult, setSearchResult] = useState<{
    main: Phrase;
    related: Phrase[];
  } | null>(null);

  useEffect(() => {
    if (searchOnly) return; // 표현집을 안 그리면 받을 필요도 없다
    let cancelled = false;
    fetch(`/api/phrases?locale=${effectiveLocale}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setBook(data.book ?? {});
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveLocale, searchOnly]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearchStatus("loading");
    setSearchResult(null);
    try {
      const res = await fetch(
        `/api/phrases/search?q=${encodeURIComponent(q)}&locale=${effectiveLocale}`,
      );
      if (!res.ok) throw new Error();
      setSearchResult(await res.json());
      setSearchStatus("done");
    } catch {
      setSearchStatus("error");
    }
  }

  return (
    <div className="mt-6">
      {/* 하고 싶은 말 검색 → 한국어 번역 */}
      <form onSubmit={search} data-tour="phrases" className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={80}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pl-10 pr-24 text-sm text-slate-100 placeholder:text-slate-500 backdrop-blur transition focus:border-amber-400/60 focus:outline-none"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-amber-400 px-4 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-300"
        >
          {t("searchButton")}
        </button>
      </form>

      {searchStatus === "loading" && (
        <p className="mt-3 flex items-center gap-2 text-sm text-amber-300/90">
          <Sparkles size={14} className="animate-pulse" />
          {t("searching")}
        </p>
      )}
      {searchStatus === "error" && (
        <p className="mt-3 text-sm text-red-400">{t("error")}</p>
      )}
      {searchStatus === "done" && searchResult && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-amber-400/30">
          <ul className="divide-y divide-white/5">
            <PhraseRow p={searchResult.main} />
            {searchResult.related.map((p, i) => (
              <PhraseRow key={i} p={p} />
            ))}
          </ul>
        </div>
      )}

      {/* 상황별 표현집 — searchOnly면 생략 (에티켓 주제 카드에 통합됨) */}
      {!searchOnly && (
      <div className="mt-6 space-y-2.5">
        {status === "loading" &&
          [0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-2xl bg-white/5" />
          ))}
        {status === "done" &&
          CATEGORY_IDS.filter((c) => book[c]?.length).map((c) => {
            const Icon = CATEGORY_ICONS[c];
            const open = openCat === c;
            return (
              <div
                key={c}
                // 둘러보기에서 펼쳐져 있는 묶음도 함께 밝힌다. 검색창만 비추면
                // 무엇을 하는 곳인지만 보이고 어떤 표현이 나오는지는 안 보인다.
                data-tour={open ? "phrases" : undefined}
                className="overflow-hidden rounded-2xl border border-white/10"
              >
                <button
                  onClick={() => setOpenCat(open ? "" : c)}
                  className={`flex w-full items-center gap-2.5 px-5 py-3.5 text-left text-sm font-semibold transition ${
                    open ? "bg-white/[0.06] text-amber-300" : "bg-white/[0.02] text-slate-200 hover:bg-white/[0.05]"
                  }`}
                >
                  <Icon size={16} strokeWidth={2} />
                  {t(`phraseCats.${c}`)}
                  <span className="ml-auto text-xs text-slate-500">
                    {book[c].length}
                  </span>
                </button>
                {open && (
                  <ul className="divide-y divide-white/5 border-t border-white/5">
                    {book[c].map((p, i) => (
                      <PhraseRow key={i} p={p} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
      </div>
      )}
    </div>
  );
}
