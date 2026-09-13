"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { appAlreadyCommitted } from "@/lib/app-boot";

/**
 * 홈 진입 커튼 인트로.
 *
 * 예전의 여러 단계 스크롤 시네마틱(노랑 로고 → 화이트 → 문구…)은 단계마다
 * 클릭·스크롤을 요구해 지루하다는 피드백을 받았다. 대신 공연 커튼 컨셉 하나로:
 * 대전 블루 커튼이 화면을 덮고 있다가, 천이 젖혀지듯 양쪽으로 갈라지며 홈이
 * 드러난다. 커튼 앞에는 마스코트가 커튼 자락을 잡고 서 있다.
 *
 * 마스코트 그림은 public/intro-mascot.png 를 먼저 찾는다 — 디자이너가 인트로용
 * 일러스트(선글라스 꿈돌이)를 그 이름으로 넣으면 코드 수정 없이 바로 반영된다.
 * 파일이 없는 동안은 리포에 이미 있는 메뉴 마스코트 아이콘으로 대신한다.
 *
 * 재생 조건은 이전과 동일하다:
 *   1. 로그인·가입 직후(?skipIntro=1)는 재생하지 않는다 — 서버가 prop으로 내려준다.
 *   2. 같은 문서 안에서 라우터로 홈에 돌아온 경우(appAlreadyCommitted)도 재생하지
 *      않는다 — 진짜 새로 연 문서에서만 한 번.
 *   3. OS '동작 줄이기' 설정 시 재생하지 않는다.
 */

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** OS의 '동작 줄이기' 설정 — HeroCarousel과 동일한 패턴 */
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

/** 커튼 한 쪽을 이루는 세로 천 조각 수 — 시차를 두고 젖혀져 천처럼 보인다 */
const STRIPS = 3;
/** 조각 사이 시차(ms)와 젖혀지는 시간(ms) */
const STAGGER_MS = 90;
const OPEN_MS = 1000;
/** 자동으로 열리기까지 — 그 전에 클릭·스크롤하면 바로 열린다 */
const AUTO_OPEN_MS = 1800;

type Phase = "closed" | "opening" | "done";

export default function IntroSequence({ skipIntro }: { skipIntro: boolean }) {
  const reducedMotion = useReducedMotion();
  // 렌더 중 한 번만 읽어 고정 (마운트 후 값이 바뀌어도 이 재생의 판단은 유지)
  const [isSpaRevisit] = useState(() => appAlreadyCommitted);
  const t = useTranslations("intro");

  const [phase, setPhase] = useState<Phase>("closed");
  // 디자이너 에셋(intro-mascot.png)이 없으면 기존 마스코트 아이콘으로 폴백
  const [mascotSrc, setMascotSrc] = useState("/intro-mascot.png");

  const active = !skipIntro && !isSpaRevisit && !reducedMotion && phase !== "done";

  const open = useCallback(() => {
    setPhase((p) => (p === "closed" ? "opening" : p));
  }, []);

  // 열림: 자동 타이머 + 클릭/스크롤/키 입력 아무거나
  useEffect(() => {
    if (!active || phase !== "closed") return;
    const auto = window.setTimeout(open, AUTO_OPEN_MS);
    const onAny = () => open();
    window.addEventListener("wheel", onAny, { passive: true });
    window.addEventListener("touchstart", onAny, { passive: true });
    window.addEventListener("keydown", onAny);
    return () => {
      window.clearTimeout(auto);
      window.removeEventListener("wheel", onAny);
      window.removeEventListener("touchstart", onAny);
      window.removeEventListener("keydown", onAny);
    };
  }, [active, phase, open]);

  // 다 젖혀지면 오버레이를 치운다
  useEffect(() => {
    if (phase !== "opening") return;
    const id = window.setTimeout(
      () => setPhase("done"),
      OPEN_MS + STAGGER_MS * (STRIPS - 1) + 150,
    );
    return () => window.clearTimeout(id);
  }, [phase]);

  // 커튼이 덮여 있는 동안은 뒤 페이지가 스크롤되지 않게
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  if (!active) return null;

  const opening = phase === "opening";

  /** 커튼 천 조각 — side: -1 왼쪽, 1 오른쪽. 바깥 조각일수록 늦게 젖혀진다 */
  const strip = (side: -1 | 1, i: number) => {
    const delay = opening ? (STRIPS - 1 - i) * STAGGER_MS : 0;
    return (
      <div
        key={`${side}-${i}`}
        aria-hidden
        className="intro-strip relative h-full flex-1"
        style={{
          transform: opening ? `translateX(${side * 112}%) skewX(${side * -4}deg)` : "none",
          transitionDelay: `${delay}ms`,
          transitionDuration: `${OPEN_MS}ms`,
        }}
      />
    );
  };

  return (
    <div
      role="dialog"
      aria-label="TourNight"
      onClick={open}
      className="fixed inset-0 z-[100] cursor-pointer overflow-hidden"
      style={{ opacity: opening ? undefined : 1 }}
    >
      {/* 커튼 원단 공통 스타일 — 대전 블루 바탕에 은은한 별점 패턴과 세로 주름 */}
      <style>{`
        .intro-strip {
          background:
            radial-gradient(circle at 25% 30%, rgba(255,255,255,0.12) 1px, transparent 1.6px),
            radial-gradient(circle at 70% 65%, rgba(255,255,255,0.09) 1px, transparent 1.6px),
            linear-gradient(90deg, rgba(0,0,0,0.22), rgba(255,255,255,0.06) 35%, rgba(0,0,0,0.16) 70%, rgba(255,255,255,0.04)),
            linear-gradient(160deg, #0a5cb8 0%, #004ea2 45%, #003d80 100%);
          background-size: 46px 46px, 62px 62px, 100% 100%, 100% 100%;
          transition-property: transform;
          transition-timing-function: cubic-bezier(0.76, 0, 0.24, 1);
          will-change: transform;
        }
      `}</style>

      {/* 왼쪽 / 오른쪽 커튼 (각각 천 조각 3장) */}
      <div className="absolute inset-y-0 left-0 flex w-1/2">
        {Array.from({ length: STRIPS }, (_, i) => strip(-1, i))}
      </div>
      <div className="absolute inset-y-0 right-0 flex w-1/2">
        {Array.from({ length: STRIPS }, (_, i) => strip(1, i))}
      </div>
      {/* 가운데 이음새 그림자 — 닫혀 있을 때만 */}
      {!opening && (
        <div
          aria-hidden
          className="absolute inset-y-0 left-1/2 w-10 -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.35),transparent_70%)]"
        />
      )}

      {/* 커튼 위 콘텐츠 — 워드마크·태그라인·마스코트. 열리면 함께 사라진다 */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center transition-opacity duration-500"
        style={{ opacity: opening ? 0 : 1 }}
      >
        <p className="text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.4)] sm:text-6xl">
          Tour<span className="text-amber-400">Night</span>
        </p>
        <p className="whitespace-pre-line text-sm leading-relaxed text-white/85 sm:text-base">
          {t("tagline")}
        </p>

        {/* 마스코트 — 커튼 자락을 잡은 자리. intro-mascot.png(디자이너 에셋)가
            생기면 그 그림이, 없으면 기존 메뉴 마스코트가 선다 */}
        <div className="intro-mascot mt-2">
          <Image
            src={mascotSrc}
            alt=""
            width={132}
            height={132}
            priority
            className="h-[108px] w-auto drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)] sm:h-[132px]"
            onError={() => setMascotSrc("/menu-icons/menu1.png")}
          />
        </div>
        <style>{`
          .intro-mascot { animation: intro-bob 2.4s ease-in-out infinite; }
          @keyframes intro-bob {
            0%, 100% { transform: translateY(0) rotate(-2deg); }
            50% { transform: translateY(-8px) rotate(2deg); }
          }
        `}</style>

        <p className="mt-6 text-[11px] font-semibold tracking-[0.3em] text-white/60">
          CLICK TO OPEN
        </p>
      </div>

      {/* 건너뛰기 — 애니메이션 없이 즉시 종료 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setPhase("done");
        }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/30 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        {t("skip")}
      </button>
    </div>
  );
}
