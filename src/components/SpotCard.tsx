"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Heart,
  Telescope,
  Trees,
  Sparkles,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { NightSpot } from "@/lib/kto";
import { useBookmarks } from "./useBookmarks";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  science: Telescope,
  nature: Trees,
  festival: Sparkles,
  city: Building2,
};

/** 사진 없는 스팟용 카테고리 그라데이션 (SpotExplorer와 같은 계열) */
const CATEGORY_SCENE: Record<string, string> = {
  science: "from-sky-950 via-slate-900 to-cyan-950",
  nature: "from-emerald-950 via-slate-900 to-teal-950",
  festival: "from-fuchsia-950 via-slate-900 to-rose-950",
  city: "from-amber-950 via-slate-900 to-orange-950",
};

/**
 * 주소에서 자치구만 뽑아 해시태그로 쓴다 ("대전광역시 유성구 …" → "유성구").
 * 화면 주소는 언어에 따라 번역돼 있으므로 반드시 한글 원문에서 뽑는다.
 */
function district(addr: string): string | null {
  return addr?.match(/([가-힣]+[구군])/)?.[1] ?? null;
}

/** 카드 한 줄 설명 — 공식 소개문의 첫 문장, 없으면 주소로 대신한다 */
function oneLiner(spot: NightSpot): string {
  const overview = spot.overview?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!overview) return spot.addr ?? "";
  const first = overview.split(/(?<=[.!?。])\s/)[0];
  return first.length > 60 ? first.slice(0, 60) + "…" : first;
}

/**
 * 홈·목록용 야경명소 카드 — 사진 + 이름 + 해시태그 + 한 줄 설명.
 * 필터·지도가 붙은 SpotExplorer와 달리 스스로 상태를 갖지 않아 어디에나 놓을 수 있다.
 */
export default function SpotCard({ spot }: { spot: NightSpot }) {
  const t = useTranslations("home");
  const Icon = CATEGORY_ICON[spot.category] ?? Building2;
  const { ids, toggle } = useBookmarks();
  const ts = useTranslations("saved");
  const saved = ids.includes(spot.contentId);
  const gu = district(spot.addrKo ?? spot.addr ?? "");

  return (
    <article className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
      <Link href={`/spots/${spot.contentId}`} className="block">
        <div
          className={`relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br ${CATEGORY_SCENE[spot.category]}`}
        >
          {spot.imageUrl ? (
            <Image
              src={spot.imageUrl}
              alt={spot.title}
              fill
              sizes="(min-width: 640px) 280px, 80vw"
              className="object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <Icon size={36} strokeWidth={1.2} className="text-slate-300" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
        </div>
        <div className="p-4">
          <h3 className="truncate text-[15px] font-bold text-slate-900 group-hover:text-amber-600">
            {spot.title}
          </h3>
          <p className="mt-1.5 flex gap-2 text-[11px] font-semibold text-amber-600">
            <span>#{t(`categories.${spot.category}`)}</span>
            {gu && <span>#{gu}</span>}
          </p>
          <p className="mt-2 line-clamp-1 text-xs text-slate-400">
            {oneLiner(spot)}
          </p>
        </div>
      </Link>

      {/* 찜 — 링크 안에 두면 카드 이동과 겹치므로 형제로 띄운다.
          아이콘만 두면 사진 위에서 눈에 안 띄어 코스 찜과 같은 글자 버튼으로 */}
      <button
        type="button"
        onClick={() => toggle(spot.contentId)}
        aria-pressed={saved}
        className={`absolute right-3 top-3 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm transition ${
          saved
            ? "bg-rose-500 text-white hover:bg-rose-600"
            : "bg-white/95 text-rose-500 hover:bg-white"
        }`}
      >
        <Heart size={13} fill={saved ? "currentColor" : "none"} />
        {saved ? ts("saved") : ts("save")}
      </button>
    </article>
  );
}
