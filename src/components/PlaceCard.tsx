import Image from "next/image";
import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * 사진이 주인공인 장소 카드 — 야경명소 목록(SpotExplorer)의 카드를 그대로 뽑아
 * 축제·맛집·숙소·쇼핑이 같은 모양을 쓰게 한 것.
 *
 * 전에는 탭마다 카드가 달랐다. 명소는 사진 위에 이름을 얹은 큰 카드, 축제는
 * 사진 아래 흰 캡션이 붙은 포스터, 맛집·숙소는 번호가 붙은 가로 줄 목록이었다.
 * 같은 서비스 안에서 탭만 옮겼는데 다른 사이트처럼 보여서 하나로 맞췄다.
 *
 * 사진 아래 여백을 두지 않고 글자를 사진 위에 얹는 게 이 카드의 핵심이라,
 * 부가 정보(축제 기간, 인근 야간 명소)도 제목 위 작은 칩으로 올린다.
 */
export interface PlaceCardBadge {
  label: string;
  Icon?: LucideIcon;
  /** 배지 글자색 — 카테고리 계열색을 넘긴다 */
  className?: string;
}

export default function PlaceCard({
  href,
  imageUrl,
  title,
  subtitle,
  badge,
  status,
  chips,
  scene = "from-slate-800 via-slate-900 to-slate-950",
  fallbackIcon: FallbackIcon,
  action,
  onClick,
  active = false,
  dataTour,
}: {
  href: string;
  imageUrl: string | null;
  title: string;
  /** 제목 아래 한 줄 — 대개 주소 */
  subtitle?: string;
  /** 좌상단 분류 배지 */
  badge?: PlaceCardBadge;
  /** 좌상단 배지 옆 상태 칩 (축제의 진행 중 / D-n) */
  status?: { label: string; className: string };
  /** 제목 위에 얹는 작은 칩들 (축제 기간, 인근 야간 명소 등) */
  chips?: ReactNode;
  /** 사진이 없을 때 깔 그라데이션 */
  scene?: string;
  fallbackIcon?: LucideIcon;
  /** 우상단에 올릴 것 — 찜하기 버튼처럼 카드마다 다른 동작 */
  action?: ReactNode;
  /** 카드를 눌렀을 때 (지도 연동 등). 없으면 카드 전체가 링크처럼 동작한다 */
  onClick?: () => void;
  active?: boolean;
  dataTour?: string;
}) {
  // 카드 전체가 <Link>일 때 안쪽에 또 <Link>를 두면 a 안에 a가 되어 어긋난다.
  // 그래서 화살표는 카드가 링크가 아닐 때만 링크로 만든다.
  const arrow = onClick ? (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      aria-label={title}
      className="shrink-0 rounded-full bg-slate-100 p-2 text-slate-900 backdrop-blur transition hover:bg-amber-400 hover:text-slate-950"
    >
      <ChevronRight size={18} />
    </Link>
  ) : (
    <span
      aria-hidden
      className="shrink-0 rounded-full bg-slate-100 p-2 text-slate-900 backdrop-blur transition group-hover:bg-amber-400 group-hover:text-slate-950"
    >
      <ChevronRight size={18} />
    </span>
  );

  const Body = (
    <div
      className={`relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br sm:h-52 ${scene}`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        FallbackIcon && (
          <FallbackIcon size={40} strokeWidth={1.2} className="text-slate-300" />
        )
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />

      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
        {badge && (
          <span
            className={`flex items-center gap-1 rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold backdrop-blur ${badge.className ?? "text-white"}`}
          >
            {badge.Icon && <badge.Icon size={11} strokeWidth={2.4} />}
            {badge.label}
          </span>
        )}
        {status && (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold shadow-sm ${status.className}`}
          >
            {status.label}
          </span>
        )}
      </div>

      {action && <div className="absolute right-3 top-3">{action}</div>}

      <div className="absolute inset-x-0 bottom-0 p-3.5">
        {chips && (
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">{chips}</div>
        )}
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] group-hover:text-amber-600">
              {title}
            </h3>
            {subtitle && (
              <p className="truncate text-[13px] text-slate-400">{subtitle}</p>
            )}
          </div>
          {arrow}
        </div>
      </div>
    </div>
  );

  const shell = `glass-card group overflow-hidden rounded-2xl ${
    active ? "!border-amber-400 !bg-amber-400/5" : ""
  }`;

  // 카드를 누르면 지도를 움직이는 화면(명소)은 article + onClick,
  // 그 밖에는 카드 전체가 상세로 가는 링크다
  return onClick ? (
    <article
      data-tour={dataTour}
      onClick={onClick}
      className={`${shell} cursor-pointer`}
    >
      {Body}
    </article>
  ) : (
    <Link href={href} data-tour={dataTour} className={`${shell} block`}>
      {Body}
    </Link>
  );
}

/** 사진 위에 얹는 작은 칩 — 기간·거리처럼 한눈에 읽어야 하는 값 */
export function PlaceChip({
  children,
  className = "bg-slate-950/70 text-white",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold backdrop-blur ${className}`}
    >
      {children}
    </span>
  );
}
