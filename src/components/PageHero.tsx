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
 * 예전엔 제목 위에 영문 오버라인(CULTURE 등)이 있었는데, 장식 이상의
 * 역할이 없어 뺀다. 제목·부제는 다시 원래처럼 위아래로 쌓되(한 줄에
 * 나란히 두는 실험은 되돌린다), 박스 높이는 오버라인이 빠진 만큼만
 * 살짝 줄인다.
 */
export default function PageHero({
  title,
  subtitle,
  image,
  width = "wide",
  children,
}: {
  title: string;
  subtitle?: string;
  /** 배경 사진 (public 경로). 페이지 성격에 맞는 야경 사진을 넣는다 */
  image: string;
  /** 본문(PageBody)과 같은 값을 줘야 좌우 선이 맞는다 */
  width?: Width;
  /** 제목 아래 배치할 요소 (필터·검색 등) */
  children?: ReactNode;
  /** 예전 오버라인 — 더는 화면에 그리지 않는다. 남은 호출부를 한 번에
   * 지우지 않아도 되도록 프롭만 조용히 받아 둔다 */
  overline?: string;
}) {
  return (
    <div className={`mx-auto px-4 pt-6 ${MAX_W[width]}`}>
      <div className="relative flex min-h-[160px] flex-col justify-center overflow-hidden rounded-3xl border border-slate-200 px-7 py-7 sm:min-h-[180px] sm:px-10">
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
        {/* 사진 위 텍스트 — 본문이 라이트로 바뀌어도 여기는 밝은 색을 명시한다 */}
        <div className="relative text-white">
          <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {subtitle}
            </p>
          )}
          {children && <div className="mt-5">{children}</div>}
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
