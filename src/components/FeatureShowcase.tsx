"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * 투어나잇을 즐겨보세요 — 대표 기능 3종을 넘겨 보는 쇼케이스.
 * 좌측은 그 기능의 제목·설명·바로가기, 우측은 큰 비주얼이 옆으로 밀려
 * 넘어가는 필름스트립. 다음 기능의 조각이 오른쪽에 미리 보이고, 화살표를
 * 누르면 깜빡임 없이 그대로 밀려 온다(네이티브 부드러운 스크롤 — 팀 피드백:
 * 전환이 느껴지면 안 된다). 모바일은 스와이프.
 * 기능마다 대전 CI 색 하나를 포인트로 쓴다 (파랑·초록·주황).
 */

type SlideKey = 1 | 2 | 3;

const SLIDES: {
  key: SlideKey;
  href: string;
  bar: string; // 포인트 색 막대
  cta: string; // 바로가기 글자색
}[] = [
  { key: 1, href: "/personality", bar: "bg-daejeon-blue", cta: "text-daejeon-blue" },
  { key: 2, href: "/stamp-tour", bar: "bg-daejeon-green", cta: "text-daejeon-green" },
  { key: 3, href: "/etiquette", bar: "bg-daejeon-orange", cta: "text-daejeon-orange" },
];

const GAP = 12; // gap-3 — 스크롤 한 걸음 계산에 쓴다

/** 슬라이드별 비주얼 — 그 기능과 직접 관련된 것만 쓴다 (성향 캐릭터·콜라주 프레임·포장마차) */
function Visual({ k }: { k: SlideKey }) {
  if (k === 1) {
    return (
      <div className="relative h-full w-full bg-[#0b1026]">
        <div className="absolute inset-x-0 bottom-6 flex items-end justify-center gap-2">
          {(["explorer", "foodie", "viewLover", "player"] as const).map((m) => (
            <Image
              key={m}
              src={`/mascots/${m}.png`}
              alt=""
              width={130}
              height={130}
              className="h-20 w-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)] sm:h-28"
            />
          ))}
        </div>
      </div>
    );
  }
  if (k === 2) {
    return (
      <div className="relative h-full w-full bg-amber-100">
        <Image
          src="/collage-frame.png"
          alt=""
          fill
          sizes="(min-width:1024px) 640px, 100vw"
          className="object-cover object-top opacity-90"
        />
      </div>
    );
  }
  return (
    <div className="relative h-full w-full">
      <Image
        src="/etiquette/pojangmacha.jpg"
        alt=""
        fill
        sizes="(min-width:1024px) 640px, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/25" />
    </div>
  );
}

export default function FeatureShowcase() {
  const t = useTranslations("home");
  const track = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const step = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const panel = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: dir * ((panel?.offsetWidth ?? 600) + GAP), behavior: "smooth" });
  };

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const panel = el.firstElementChild as HTMLElement | null;
    const w = (panel?.offsetWidth ?? 600) + GAP;
    const i = Math.min(SLIDES.length - 1, Math.max(0, Math.round(el.scrollLeft / w)));
    setIdx(i);
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 4);
  };

  const slide = SLIDES[idx];

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      {/* ── 좌: 기능 소개 — 스크롤 위치에 맞춰 그대로 바뀐다 (전환 효과 없음) ── */}
      <div>
        <p className="text-sm font-bold tracking-wide text-slate-400">
          {t("enjoyTitle")}
        </p>
        <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
          {t(`enjoy${slide.key}`)}
        </h2>
        <div className={`mt-5 h-1 w-12 rounded-full ${slide.bar}`} />
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-slate-600">
          {t(`enjoy${slide.key}Desc`)}
        </p>
        <Link
          href={slide.href}
          className={`mt-9 inline-flex items-center gap-2 text-sm font-bold ${slide.cta} transition hover:gap-3`}
        >
          {t(`enjoy${slide.key}Cta`)}
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* ── 우: 필름스트립 — 다음 슬라이드 조각이 옆에 미리 보인다 ── */}
      <div className="min-w-0">
        <div
          ref={track}
          onScroll={onScroll}
          className="tn-scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto"
        >
          {SLIDES.map((s) => (
            <Link
              key={s.key}
              href={s.href}
              aria-label={t(`enjoy${s.key}`)}
              className="relative block h-72 w-full shrink-0 snap-start overflow-hidden sm:h-[420px] md:w-[calc(100%-6.75rem)] lg:w-[calc(100%-8.75rem)]"
            >
              <Visual k={s.key} />
            </Link>
          ))}
          {/* 마지막 슬라이드도 왼쪽에 딱 붙을 수 있게 남기는 빈 칸 */}
          <div aria-hidden className="hidden w-24 shrink-0 md:block lg:w-32" />
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={atStart}
            aria-label={t("showcasePrev")}
            className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:text-slate-300 disabled:hover:bg-slate-100"
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
      </div>
    </div>
  );
}
