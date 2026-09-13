"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Bookmark, Plus, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { NightSpot } from "@/lib/kto";
import { useBookmarks } from "./useBookmarks";

/**
 * 찜한 장소 (피드백 8) — 명소 카드의 저장 버튼으로 모은 곳들.
 *
 * 북마크는 localStorage에 id만 있으므로, 실물(사진·이름)은 명소 목록 API로
 * 되살린다. 두 얼굴로 쓴다:
 * - grid   : 마이페이지 "찜한 장소" — 사진 카드, 누르면 상세, 찜 해제 가능
 * - picker : 코스 결과 하단 — 이미지를 누르면 코스에 그 장소가 추가된다
 */
export default function SavedSpots({
  mode,
  onPick,
  excludeIds = [],
}: {
  mode: "grid" | "picker";
  /** picker에서 이미지를 눌렀을 때 — 코스에 추가 */
  onPick?: (spot: NightSpot) => void;
  /** picker에서 숨길 id (이미 코스에 들어간 곳) */
  excludeIds?: string[];
}) {
  const t = useTranslations("saved");
  const locale = useLocale();
  const { ids, toggle } = useBookmarks();
  const [all, setAll] = useState<NightSpot[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/spots/list?locale=${locale}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!cancelled) setAll(d.spots ?? []);
      })
      .catch(() => {
        if (!cancelled) setAll([]);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const saved = (all ?? []).filter(
    (s) => ids.includes(s.contentId) && !excludeIds.includes(s.contentId),
  );

  if (mode === "picker") {
    if (ids.length === 0) return null; // 찜이 없으면 조용히 생략
    return (
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
          <Bookmark size={14} className="text-daejeon-blue" />
          {t("pickerTitle")}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">{t("pickerHint")}</p>
        {all === null ? (
          <div className="mt-3 h-20 animate-pulse rounded-xl bg-slate-200" />
        ) : saved.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">{t("pickerAllAdded")}</p>
        ) : (
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {saved.map((s) => (
              <button
                key={s.contentId}
                type="button"
                onClick={() => onPick?.(s)}
                className="group w-24 shrink-0 text-left"
                aria-label={s.title}
              >
                <div className="relative h-20 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
                  {s.imageUrl && (
                    <Image
                      src={s.imageUrl}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition group-hover:bg-slate-950/35">
                    <Plus
                      size={22}
                      className="text-white opacity-0 drop-shadow transition group-hover:opacity-100"
                    />
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-slate-600 group-hover:text-daejeon-blue">
                  {s.title}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── grid (마이페이지) ──
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <Bookmark size={17} className="text-daejeon-blue" />
        {t("title")}
        {ids.length > 0 && (
          <span className="text-sm font-semibold text-slate-400">{ids.length}</span>
        )}
      </h2>
      {ids.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
          {t("empty")}
        </p>
      ) : all === null ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {saved.map((s) => (
            <div key={s.contentId} className="group relative">
              <Link href={`/spots/${s.contentId}`} className="block">
                <div className="relative h-28 overflow-hidden rounded-2xl border border-slate-200 bg-slate-200">
                  {s.imageUrl && (
                    <Image
                      src={s.imageUrl}
                      alt={s.title}
                      fill
                      sizes="(min-width: 640px) 200px, 50vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <p className="mt-1.5 line-clamp-1 text-[13px] font-bold text-slate-800 group-hover:text-daejeon-blue">
                  {s.title}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => toggle(s.contentId)}
                aria-label={t("remove")}
                className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-500 shadow transition hover:text-rose-500"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
