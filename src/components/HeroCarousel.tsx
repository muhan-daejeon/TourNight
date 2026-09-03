"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type TransitionEvent,
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

/** 한 장을 읽고 넘어가기까지 */
const INTERVAL_MS = 5_000;

/** 옆으로 밀리는 시간 — 짧으면 툭 바뀌고, 길면 답답하다 */
const SLIDE_MS = 700;

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

/** 배너 한 장 */
function Slide({
  slide,
  active,
  priority,
}: {
  slide: HeroSlide;
  /** 지금 보이는 장인가 — 숨은 장은 읽히지도, 탭으로 잡히지도 않게 한다 */
  active: boolean;
  priority: boolean;
}) {
  return (
    // 바깥 칸은 트랙 이동 단위(= 뷰포트 래퍼 폭), 안쪽이 실제 카드.
    // 칸에 px를 줘서 카드 사이 간격을 만든다 — 양옆으로 엿보이는 이웃 장과
    // 붙어 보이지 않게. 참고 시안(휘어진 3D 캐러셀)과 달리 카드는 일자(평면)다.
    // 비활성 장은 화면 양옆에 보이지만 조작 대상은 아니다 — 클릭은 화살표로 넘긴 뒤에
    <div
      aria-hidden={!active}
      className={`w-full shrink-0 px-2 sm:px-4 ${active ? "" : "pointer-events-none"}`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br sm:rounded-3xl ${slide.gradient} transition-[opacity,transform] duration-700 ${
          active ? "opacity-100 scale-100" : "opacity-40 scale-[0.97]"
        }`}
      >
      {slide.image && (
        <Image
          src={slide.image}
          alt=""
          fill
          priority={priority}
          // 옆으로 밀려 있는 장은 화면 밖이라 게으른 로딩이 걸린다. 그대로 두면
          // 처음 넘어올 때 사진이 비어 있다가 뒤늦게 뜬다 → 미리 받아 둔다
          loading={priority ? undefined : "eager"}
          sizes="100vw"
          // 45%는 사진 색을 다 죽여 화면이 칙칙했다 — 왼쪽 텍스트 가독은
          // 아래 가로 그라데이션이 담당하므로 사진 자체는 더 살린다
          className="object-cover opacity-70"
        />
      )}
      {/* 사진이 없는 슬라이드는 오른쪽에 빛무리를 둬 시안의 우측 이미지 자리를 채운다 */}
      {!slide.image && (
        <div className="pointer-events-none absolute -right-24 top-1/2 hidden size-[420px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(165,180,252,0.35),transparent_65%)] sm:block" />
      )}
      {/* 왼쪽 텍스트가 사진 위에서도 읽히도록 왼쪽을 더 어둡게 깐다.
          텍스트가 없는 오른쪽 절반은 일찍 투명해져 사진 색이 그대로 보인다 */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/35 to-transparent" />

      {/* 높이를 min-height가 아니라 고정 height로 둔다 — 번역마다 글 길이가 달라
          (특히 영어가 한국어보다 꽤 길다) min-height면 그 장의 텍스트가 줄바꿈되는
          만큼 캐러셀 전체 높이가 로케일별로 들쭉날쭉해진다. 넘치는 줄은 아래
          subtitle의 line-clamp로 조용히 자른다 */}
      <div className="relative flex h-[408px] flex-col justify-center px-7 py-14 sm:h-[504px] sm:px-14 sm:py-20">
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-300 sm:text-sm">
          {slide.overline}
        </p>
        {/* sm 이상에서 5xl을 썼었는데, 영어(다른 로케일도)는 같은 문구가 한국어보다
            훨씬 길어서 2줄을 꽉 채우면 고정 높이 박스 안에서 부제와 겹쳤다
            (박스는 일부러 고정 높이라 로케일마다 캐러셀 키가 달라지지 않게
            해 둔 것 — HeroCarousel 위 주석·페이지 히어로~본문 간격 계산 참고).
            4xl로 낮춰 2줄이어도 여유 있게 들어가게 한다 */}
        <h1 className="mt-4 line-clamp-2 max-w-xl text-3xl font-extrabold leading-[1.22] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.8)] sm:text-4xl">
          <TitleWithHighlight title={slide.title} highlight={slide.highlight} />
        </h1>
        <p className="mt-5 line-clamp-3 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
          {slide.subtitle}
        </p>
        <div className="mt-8">
          <Link
            href={slide.href}
            tabIndex={active ? undefined : -1}
            className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(251,191,36,0.45)] transition hover:bg-amber-300"
          >
            {slide.ctaLabel}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}

/**
 * 메인 히어로 배너 — 지금 열리는 대전 프로그램을 옆으로 밀어 넘긴다.
 *
 * 슬라이드를 전부 가로로 늘어놓고 트랙을 translateX로 민다. 한 장만 갈아끼우면
 * 순식간에 바뀌어 넘어가는 게 보이지 않는다.
 *
 * 끝에서 처음으로 돌아갈 때 뒤로 주르륵 되감기지 않도록, 트랙 양끝에 첫/끝 장의
 * 복제를 하나씩 둔다. 복제까지 밀고 난 뒤(transitionend) 애니메이션을 끈 채
 * 같은 그림의 진짜 위치로 옮겨 놓으면 사용자 눈에는 계속 한 방향으로 흐른다.
 *
 * 자동 넘김은 접근성상 반드시 멈출 수 있어야 해서 일시정지 버튼을 두고,
 * OS에서 '동작 줄이기'를 켠 사용자에겐 자동 넘김도 미는 효과도 걸지 않는다.
 */
export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const t = useTranslations("home");
  const count = slides.length;
  const looped = count > 1;

  // [마지막 복제, ...실제, 첫 장 복제] — pos는 이 트랙 위의 칸 번호
  const track = looped ? [slides[count - 1], ...slides, slides[0]] : slides;
  const [pos, setPos] = useState(looped ? 1 : 0);
  // 복제 칸에서 진짜 칸으로 순간이동하는 중에는 미는 효과를 끈다
  const [jumping, setJumping] = useState(false);

  // null = 아직 버튼을 누른 적 없음 → OS 설정을 따른다. 누르면 그 선택이 이긴다
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useReducedMotion();
  const playing = userPaused === null ? !reducedMotion : !userPaused;

  const index = looped ? (pos - 1 + count) % count : 0;

  const go = useCallback(
    (delta: number) => {
      // 순간이동 직후라도 다음 이동은 다시 밀면서 가야 한다. 두 setState는 한 번에
      // 반영되므로 '효과 켜기 + 위치 이동'이 같은 프레임에 일어난다
      setJumping(false);
      // 미는 동안 연타하면 트랙 밖으로 나가 빈 화면이 되므로 양끝에서 멈춘다
      setPos((p) => Math.min(Math.max(p + delta, 0), count + 1));
    },
    [count],
  );

  /** 복제 칸까지 밀었으면 같은 그림의 진짜 칸으로 소리 없이 옮긴다 */
  const handleTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    // 자식(CTA 버튼 등)의 transition도 여기까지 올라온다 → 트랙 자신의 이동만 본다
    if (!looped || e.target !== e.currentTarget || e.propertyName !== "transform") {
      return;
    }
    if (pos === count + 1) {
      setJumping(true);
      setPos(1);
    } else if (pos === 0) {
      setJumping(true);
      setPos(count);
    }
  };

  useEffect(() => {
    // 포인터가 배너 위에 있으면 읽는 중이라 보고, 넘기지 않는다
    if (!playing || hovered || !looped) return;
    const id = setInterval(() => go(1), INTERVAL_MS);
    return () => clearInterval(id);
  }, [playing, hovered, looped, go]);

  if (!count) return null;

  return (
    // 풀블리드 — 섹션이 화면 양끝까지 차지하고, 가운데 래퍼(한 장 폭)를 넘어가는
    // 이웃 장들이 양옆에 평면으로 엿보인다(서울의 밤 포털처럼 꽉 찬 느낌).
    // 래퍼 밖으로 넘친 장은 이 섹션의 overflow-hidden이 화면 끝에서 자른다.
    <section
      className="relative overflow-hidden"
      aria-roledescription="carousel"
      aria-label={t("heroCarousel")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 트랙 이동 단위가 되는 "한 장 폭" 래퍼 — 모바일은 이웃이 살짝만,
          데스크톱은 12vw씩 보이도록 폭을 잡는다 */}
      <div className="mx-auto w-[88vw] max-w-[1280px] sm:w-[76vw]">
        <div
          className="flex"
          onTransitionEnd={handleTransitionEnd}
          style={{
            transform: `translateX(-${pos * 100}%)`,
            transition:
              jumping || reducedMotion
                ? "none"
                : `transform ${SLIDE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`,
          }}
        >
          {track.map((slide, i) => (
            <Slide
              key={`${slide.id}-${i}`}
              slide={slide}
              active={i === pos}
              // 처음 보이는 장만 미리 받는다 (looped면 1번 칸이 첫 장)
              priority={i === (looped ? 1 : 0)}
            />
          ))}
        </div>
      </div>

      {looped && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t("prevSlide")}
            className="absolute left-5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/15 bg-slate-950/50 p-2.5 text-white backdrop-blur transition hover:bg-slate-950/80 sm:block"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t("nextSlide")}
            className="absolute right-5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/15 bg-slate-950/50 p-2.5 text-white backdrop-blur transition hover:bg-slate-950/80 sm:block"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute inset-x-0 bottom-5 z-10 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t("prevSlide")}
              className="rounded-full p-1 text-slate-300 transition hover:text-white sm:hidden"
            >
              <ChevronLeft size={15} />
            </button>
            {/* 몇 번째인지는 화면에 보이므로, 읽어주는 쪽은 이 한 줄만 담당한다 */}
            <span
              aria-live="polite"
              className="text-xs font-semibold tabular-nums text-slate-300"
            >
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
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t("nextSlide")}
              className="rounded-full p-1 text-slate-300 transition hover:text-white sm:hidden"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
