"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export interface ShowcaseSpot {
  contentId: string;
  title: string;
  addr: string;
  imageUrl: string;
  /** KTO 소개문 첫 부분 (없으면 주소만 보여준다) */
  desc: string;
}

/**
 * 오늘 밤, 어디로 갈까요? — 좌측 제목 + 원형 화살표, 우측은 사진·설명 카드가
 * 가로로 흐르는 캐러셀. 화살표는 카드 한 장 폭만큼 밀고, 끝에 닿으면 비활성.
 * 터치에서는 그냥 옆으로 쓸어 넘기면 된다 (scroll-snap).
 */
export default function SpotShowcase({ spots }: { spots: ShowcaseSpot[] }) {
  const t = useTranslations("home");
  const track = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const step = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const gap = 20; // gap-5
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 300) + gap), behavior: "smooth" });
  };

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 4);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-14">
      {/* ── 좌: 제목 + 화살표 ── */}
      <div>
        <p className="text-sm font-semibold text-slate-500">{t("spotsSectionSub")}</p>
        <h2 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-daejeon-blue sm:text-4xl">
          {t("spotsSection")}
        </h2>
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={atStart}
            aria-label={t("showcasePrev")}
            className="flex size-11 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-300"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={atEnd}
            aria-label={t("showcaseNext")}
            className="flex size-11 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-300"
          >
            <ArrowRight size={18} />
          </button>
        </div>
        <Link
          href="/spots"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-daejeon-blue"
        >
          {t("spotsViewAll")} <ArrowRight size={15} />
        </Link>
      </div>

      {/* ── 우: 카드 캐러셀 ── */}
      <div
        ref={track}
        onScroll={onScroll}
        className="tn-scrollbar-none -mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-2 lg:mx-0 lg:px-0"
      >
        {spots.map((s) => (
          <Link
            key={s.contentId}
            href={`/spots/${s.contentId}`}
            className="group w-[240px] shrink-0 snap-start bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md sm:w-[280px]"
          >
            <div className="relative h-60 overflow-hidden bg-slate-200 sm:h-72">
              <Image
                src={s.imageUrl}
                alt={s.title}
                fill
                sizes="280px"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-5">
              <h3 className="line-clamp-1 text-lg font-bold text-slate-900 group-hover:text-daejeon-blue">
                {s.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                {s.desc || s.addr}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
