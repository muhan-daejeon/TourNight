"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Plus, RotateCcw, Search, Sliders, X } from "lucide-react";
import type { Course, CourseStop } from "@/lib/courses";

/**
 * 코스 다듬기 — 추천받은 코스를 내가 갈 순서로 고친다.
 *
 * 화살표로 순서를 바꾸고, X로 빼고, 아래 목록에서 명소를 더한다. 고친 결과는
 * 부모(CourseExplorer)가 브라우저에 담아 두므로 새로고침해도 그대로다.
 * 드래그 대신 화살표를 쓰는 건 폰에서도 확실하고 접근성도 낫기 때문이다
 * (설문 코스의 다듬기와 같은 방식).
 */
export default function CourseCustomizer({
  course,
  baseIds,
  pool,
  onChange,
  onReset,
}: {
  /** 지금 화면에 보이는 (이미 편집이 반영된) 코스 */
  course: Course;
  /** 처음 추천대로의 경유지 순서 — 되돌리기 버튼을 보일지 판단한다 */
  baseIds: string[];
  /** 더할 수 있는 명소 전체 */
  pool: CourseStop[];
  onChange: (ids: string[]) => void;
  onReset: () => void;
}) {
  const t = useTranslations("courses");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const ids = course.stops.map((s) => s.contentId);
  const edited =
    ids.length !== baseIds.length || ids.some((id, i) => baseIds[i] !== id);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const q = query.trim().toLowerCase();
  const candidates = pool
    .filter((s) => !ids.includes(s.contentId))
    .filter((s) => !q || s.title.toLowerCase().includes(q) || s.addr.toLowerCase().includes(q))
    .slice(0, 30);

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-slate-800"
      >
        <Sliders size={15} className="text-daejeon-blue" />
        {t("editTitle")}
        {edited && (
          <span className="rounded-full bg-daejeon-blue px-2 py-0.5 text-[10px] font-bold text-white">
            {t("editedBadge")}
          </span>
        )}
        <span className="ml-auto text-slate-400">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-200 p-4">
          <p className="text-xs text-slate-400">{t("editHintAll")}</p>

          <ol className="mt-3 space-y-2">
            {course.stops.map((st, i) => (
              <li
                key={st.contentId}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-daejeon-blue text-[11px] font-extrabold text-white">
                  {i + 1}
                </span>
                {st.imageUrl && (
                  <span className="relative h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 작은 썸네일, 원본 크기 그대로 */}
                    <img src={st.imageUrl} alt="" className="h-full w-full object-cover" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800">
                    {st.title}
                  </span>
                  <span className="block truncate text-xs text-slate-400">{st.addr}</span>
                </span>
                <span className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={t("editMoveUp")}
                    className="rounded-full p-1 text-slate-400 transition enabled:hover:text-daejeon-blue disabled:opacity-30"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === course.stops.length - 1}
                    aria-label={t("editMoveDown")}
                    className="rounded-full p-1 text-slate-400 transition enabled:hover:text-daejeon-blue disabled:opacity-30"
                  >
                    <ChevronDown size={14} />
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => onChange(ids.filter((id) => id !== st.contentId))}
                  disabled={course.stops.length <= 2}
                  aria-label={t("editRemove")}
                  className="shrink-0 rounded-full p-1.5 text-slate-400 transition enabled:hover:text-rose-500 disabled:opacity-30"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ol>

          {/* 명소 더하기 — 고른 곳은 코스 끝에 붙는다 (순서는 화살표로 옮긴다) */}
          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="text-sm font-bold text-slate-800">{t("editAddTitle")}</p>
            <label className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Search size={14} className="shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("editSearch")}
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>

            {candidates.length === 0 ? (
              <p className="mt-3 text-xs text-slate-400">{t("editNoMatch")}</p>
            ) : (
              <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {candidates.map((s) => (
                  <li key={s.contentId}>
                    <button
                      type="button"
                      onClick={() => onChange([...ids, s.contentId])}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:border-daejeon-blue hover:bg-slate-50"
                    >
                      {s.imageUrl && (
                        <span className="relative h-9 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element -- 작은 썸네일, 원본 크기 그대로 */}
                          <img src={s.imageUrl} alt="" className="h-full w-full object-cover" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800">
                          {s.title}
                        </span>
                        <span className="block truncate text-xs text-slate-400">{s.addr}</span>
                      </span>
                      <Plus size={15} className="shrink-0 text-daejeon-blue" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* amber 스케일은 이 테마에서 50~950이 모두 같은 주황이라
              bg-amber-50 + text-amber-700을 쓰면 글자가 배경에 묻힌다 */}
          {edited && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
              <p className="text-xs leading-relaxed text-slate-500">
                {t("editedNote")}
              </p>
              <button
                type="button"
                onClick={onReset}
                className="mt-2 flex items-center gap-1.5 text-xs font-bold text-daejeon-blue transition hover:brightness-110"
              >
                <RotateCcw size={13} />
                {t("editReset")}
              </button>
            </div>
          )}
          <p className="mt-3 text-[11px] text-slate-400">{t("editSavedNote")}</p>
        </div>
      )}
    </div>
  );
}
