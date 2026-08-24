import Image from "next/image";
import type { ReactNode } from "react";

/** wide = 목록·지도형, narrow = 글을 읽는 화면 */
type Width = "wide" | "narrow";

const MAX_W: Record<Width, string> = {
  wide: "max-w-6xl",
  narrow: "max-w-3xl",
};

/**
 * 하위 페이지 공통 헤더.
 *
 * 홈이 시안대로 개편되면서 나머지 탭과 인상이 갈렸다. 홈 첫 화면처럼 사진을 깔고
 * 그 위에 제목을 얹되(rounded-3xl), 하위 페이지는 내용이 주인공이므로 높이를
 * 절반으로 줄인다.
 */
export default function PageHero({
  overline,
  title,
  subtitle,
  image,
  width = "wide",
  children,
}: {
  /** 상단 영문 라벨 */
  overline: string;
  title: string;
  subtitle?: string;
  /** 배경 사진 (public 경로). 페이지 성격에 맞는 야경 사진을 넣는다 */
  image: string;
  /** 본문(PageBody)과 같은 값을 줘야 좌우 선이 맞는다 */
  width?: Width;
  /** 제목 아래 배치할 요소 (필터·검색 등) */
  children?: ReactNode;
}) {
  return (
    <div className={`mx-auto px-4 pt-6 ${MAX_W[width]}`}>
      <div className="relative flex min-h-[190px] flex-col justify-center overflow-hidden rounded-3xl border border-white/10 px-7 py-9 sm:min-h-[210px] sm:px-10">
        <Image
          src={image}
          alt=""
          fill
          sizes="(min-width: 1152px) 1120px, 100vw"
          className="object-cover"
          priority
        />
        {/* 글자가 얹히는 왼쪽은 진하게, 오른쪽은 사진이 살아 있게 */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/30" />
        <div className="relative">
          <p className="overline-label">{overline}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {subtitle}
            </p>
          )}
          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </div>
  );
}

/** 헤더 아래 본문 — 페이지마다 제각각이던 폭을 하나로 맞춘다 */
export function PageBody({
  children,
  width = "wide",
}: {
  children: ReactNode;
  width?: Width;
}) {
  return (
    <div className={`mx-auto px-4 pb-16 pt-8 ${MAX_W[width]}`}>{children}</div>
  );
}
