"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * 가로 스크롤 나열 + 좌우 화살표.
 *
 * 스크롤 자체는 브라우저 네이티브(overflow-x)로 두고 화살표는 보조 수단이다.
 * 모바일에선 손가락으로 밀면 되고, 화살표는 포인터 사용자를 위해 데스크톱에서만 뜬다.
 */
export default function ScrollRail({
  label,
  children,
}: {
  /** 스크린리더용 영역 이름 */
  label: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  const t = useTranslations("home");

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    // 소수점 스크롤 폭 때문에 정확히 같아지지 않아 여유를 둔다
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrow =
    "absolute top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/15 bg-slate-950/80 p-2 text-white backdrop-blur transition hover:bg-slate-900 disabled:pointer-events-none disabled:opacity-0 lg:block";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        disabled={atStart}
        aria-label={t("scrollPrev")}
        className={`${arrow} -left-4`}
      >
        <ChevronLeft size={20} />
      </button>
      <div
        ref={ref}
        onScroll={sync}
        role="group"
        aria-label={label}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scroll(1)}
        disabled={atEnd}
        aria-label={t("scrollNext")}
        className={`${arrow} -right-4`}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
