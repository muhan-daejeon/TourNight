"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { NOTICES, type Notice, type NoticeCategory } from "@/lib/notices";

const PAGE_SIZE = 10;
// 전체 더미 데이터 중 최신 날짜 기준 14일 이내는 NEW 배지
const NEW_WITHIN_DAYS = 14;
const LATEST_DATE = NOTICES.reduce((max, n) => (n.date > max ? n.date : max), NOTICES[0].date);
function isNew(date: string) {
  const diffMs = new Date(LATEST_DATE).getTime() - new Date(date).getTime();
  return diffMs / 86_400_000 <= NEW_WITHIN_DAYS;
}

const CATEGORY_LABEL: Record<NoticeCategory, string> = {
  daejeon: "대전",
  tournight: "투어나잇",
};

type SearchScope = "all" | "title" | "author" | "body";
const SCOPE_LABEL: Record<SearchScope, string> = {
  all: "전체",
  title: "제목",
  author: "작성자",
  body: "내용",
};

function matches(n: Notice, scope: SearchScope, q: string) {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hit = (s: string) => s.toLowerCase().includes(needle);
  if (scope === "title") return hit(n.title);
  if (scope === "author") return hit(n.author);
  if (scope === "body") return hit(n.body);
  return hit(n.title) || hit(n.author) || hit(n.body);
}

/**
 * 공지사항 전체 목록 — 분류·검색 필터, 페이지네이션, 클릭 시 그 행 아래로
 * 펼쳐지는 아코디언(새 페이지 이동 없음).
 */
export default function NoticeBoard() {
  const [category, setCategory] = useState<"" | NoticeCategory>("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [queryInput, setQueryInput] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      NOTICES.filter(
        (n) => (category === "" || n.category === category) && matches(n, scope, appliedQuery),
      ),
    [category, scope, appliedQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setAppliedQuery(queryInput);
    setPage(1);
  }

  return (
    <div>
      {/* 분류선택 · 검색범위 · 검색어 · 검색 */}
      <form
        onSubmit={runSearch}
        className="flex flex-wrap items-center justify-end gap-2 border-b-2 border-slate-800 pb-6"
      >
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as "" | NoticeCategory);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-daejeon-blue"
        >
          <option value="">분류선택</option>
          <option value="daejeon">대전</option>
          <option value="tournight">투어나잇</option>
        </select>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as SearchScope)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-daejeon-blue"
        >
          {(Object.keys(SCOPE_LABEL) as SearchScope[]).map((s) => (
            <option key={s} value={s}>
              {SCOPE_LABEL[s]}
            </option>
          ))}
        </select>
        <input
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="검색어를 입력하세요"
          className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-daejeon-blue"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-lg bg-daejeon-green px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
        >
          <Search size={14} />
          검색
        </button>
      </form>

      {/* 목록 */}
      <div>
        {pageItems.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">검색 결과가 없습니다.</p>
        ) : (
          pageItems.map((n) => {
            const expanded = expandedId === n.id;
            return (
              <div key={n.id} className="border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : n.id)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] text-slate-900">
                      <span className="font-bold text-amber-600">[{CATEGORY_LABEL[n.category]}]</span>{" "}
                      <span className="font-semibold">{n.title}</span>
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                      <span>공지</span>
                      <span>|</span>
                      <span>{n.author}</span>
                      <span>|</span>
                      <span>{n.date}</span>
                      <span>|</span>
                      <span>조회수{n.views.toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    {isNew(n.date) && <span className="text-xs font-bold text-orange-500">NEW</span>}
                    <span className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-500">
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </span>
                  </div>
                </button>
                {expanded && (
                  <div className="border-t border-slate-100 bg-slate-50 px-1 py-5 text-sm leading-relaxed text-slate-600 sm:px-4">
                    {n.body}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 쪽번호 */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${
                p === page
                  ? "bg-daejeon-blue text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
