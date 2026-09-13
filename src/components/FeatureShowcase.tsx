"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * 투어나잇을 즐겨보세요 — 대표 기능 3종을 넘겨 보는 쇼케이스.
 * 좌측은 그 기능의 제목·설명·바로가기, 우측은 큰 비주얼 + 다음 기능의
 * 세로 미리보기. 원형 화살표로 한 장씩 넘긴다(끝에서 처음으로 순환).
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
  { key: 3, href: "/klife/restaurant", bar: "bg-daejeon-orange", cta: "text-daejeon-orange" },
];

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
  const [idx, setIdx] = useState(0);

  const slide = SLIDES[idx];
  const nextSlide = SLIDES[(idx + 1) % SLIDES.length];
  const prev = () => setIdx((i) => (i + SLIDES.length - 1) % SLIDES.length);
  const next = () => setIdx((i) => (i + 1) % SLIDES.length);

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      {/* ── 좌: 기능 소개 ── */}
      <div key={`text-${slide.key}`} className="animate-[tn-fade_.45s_ease]">
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

      {/* ── 우: 큰 비주얼 + 다음 기능 미리보기 + 화살표 ── */}
      <div>
        <div className="flex gap-3">
          <Link
            href={slide.href}
            aria-label={t(`enjoy${slide.key}`)}
            className="group relative block h-72 min-w-0 flex-1 overflow-hidden sm:h-[420px]"
          >
            <div key={`main-${slide.key}`} className="h-full w-full animate-[tn-fade_.45s_ease]">
              <Visual k={slide.key} />
            </div>
          </Link>
          {/* 다음 슬라이드의 세로 조각 — 누르면 다음으로 */}
          <button
            type="button"
            onClick={next}
            aria-label={t(`enjoy${nextSlide.key}`)}
            className="relative hidden h-72 w-24 shrink-0 overflow-hidden opacity-80 transition hover:opacity-100 sm:h-[420px] md:block lg:w-32"
          >
            <div key={`peek-${nextSlide.key}`} className="h-full w-full animate-[tn-fade_.45s_ease]">
              <Visual k={nextSlide.key} />
            </div>
          </button>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={prev}
            aria-label={t("showcasePrev")}
            className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={t("showcaseNext")}
            className="flex size-11 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
