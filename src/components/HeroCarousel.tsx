"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";

export interface HeroSlide {
  id: string;
  /** 제목 위 작은 문구 */
  overline: string;
  title: string;
  /** title 안에서 앰버로 강조할 부분 (없으면 전체 흰색) */
  highlight?: string;
  subtitle: string;
  ctaLabel: string;
  /** locale 접두사 없는 내부 경로 */
  href: string;
  /** 배경 그라데이션 (Tailwind from-/via-/to- 조합) */
  gradient: string;
  /** 있으면 그라데이션 위에 얹는다 */
  image?: string | null;
}

const INTERVAL_MS = 6000;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** OS의 '동작 줄이기' 설정 — 서버에서는 알 수 없어 false로 두고 하이드레이션 후 맞춘다 */
function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_MOTION);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** 제목 안의 강조어만 앰버로 — 참고 시안의 "대전 열기구 체험" 형태 */
function TitleWithHighlight({
  title,
  highlight,
}: {
  title: string;
  highlight?: string;
}) {
  if (!highlight) return <>{title}</>;
  const at = title.indexOf(highlight);
  if (at < 0) return <>{title}</>;
  return (
    <>
      {title.slice(0, at)}
      <span className="text-amber-300">{highlight}</span>
      {title.slice(at + highlight.length)}
    </>
  );
}

/**
 * 메인 히어로 배너 — 지금 열리는 대전 프로그램을 한 장씩 넘겨 보여준다.
 *
 * 자동 넘김은 접근성상 반드시 멈출 수 있어야 해서 일시정지 버튼을 두고,
 * OS에서 '동작 줄이기'를 켠 사용자에겐 처음부터 자동 넘김을 걸지 않는다.
 */
export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const t = useTranslations("home");
  const [index, setIndex] = useState(0);
  // null = 아직 버튼을 누른 적 없음 → OS 설정을 따른다. 누르면 그 선택이 이긴다
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useReducedMotion();
  const count = slides.length;
  const liveRef = useRef<HTMLDivElement>(null);

  const playing = userPaused === null ? !reducedMotion : !userPaused;

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count],
  );

  useEffect(() => {
    // 포인터가 배너 위에 있으면 읽는 중이라 보고, 넘기지 않는다
    if (!playing || hovered || count < 2) return;
    const id = setInterval(() => go(1), INTERVAL_MS);
    return () => clearInterval(id);
  }, [playing, hovered, count, go]);

  if (!count) return null;
  const slide = slides[index];

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-white/10"
      aria-roledescription="carousel"
      aria-label={t("heroCarousel")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`relative bg-gradient-to-br ${slide.gradient}`}>
        {slide.image && (
          <Image
            key={slide.image}
            src={slide.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-45"
          />
        )}
        {/* 왼쪽 텍스트가 사진 위에서도 읽히도록 왼쪽을 더 어둡게 깐다 */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-transparent" />

        <div
          ref={liveRef}
          aria-live="polite"
          className="relative flex min-h-[340px] flex-col justify-center px-7 py-14 sm:min-h-[420px] sm:px-14 sm:py-20"
        >
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-300 sm:text-sm">
            {slide.overline}
          </p>
          <h1 className="mt-4 max-w-xl text-3xl font-extrabold leading-[1.22] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.8)] sm:text-5xl">
            <TitleWithHighlight
              title={slide.title}
              highlight={slide.highlight}
            />
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
            {slide.subtitle}
          </p>
          <div className="mt-8">
            <Link
              href={slide.href}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-[0_0_28px_rgba(99,102,241,0.45)] transition hover:bg-indigo-400"
            >
              {slide.ctaLabel}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t("prevSlide")}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-slate-950/50 p-2.5 text-white backdrop-blur transition hover:bg-slate-950/80 sm:left-5"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t("nextSlide")}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-slate-950/50 p-2.5 text-white backdrop-blur transition hover:bg-slate-950/80 sm:right-5"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute inset-x-0 bottom-5 z-10 flex items-center justify-center gap-3">
            <span className="text-xs font-semibold tabular-nums text-slate-300">
              {index + 1} / {count}
            </span>
            <button
              type="button"
              onClick={() => setUserPaused(playing)}
              aria-label={playing ? t("pauseSlides") : t("playSlides")}
              className="rounded-full p-1 text-slate-300 transition hover:text-white"
            >
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
