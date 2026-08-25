"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useTranslations } from "next-intl";

/**
 * 홈 진입 스크롤 시네마틱.
 *
 * 0. (스크롤 무관, 자동) 노란 화면 위에 "TourNight"이 한 글자씩 타이핑되듯 나타난다.
 * A. 앞 글자부터 아래로 떨어지며 사라진다 (배경은 노랑→검정으로 크로스페이드).
 * B. 검정 배경 위 흰 원이 나타나 화면 전체를 덮을 때까지 커진다 (=화면이 흰색이 됨).
 * D. 얇고 옅은 회색 문구가 나타나고, 앞 글자부터 검정으로 바뀐다.
 * E. 중앙에 큰 TourNight 로고가 그려진 검정 화면이 통째로 아래에서 위로 올라온다.
 * G. 다 올라오면(스크롤과 무관, 자동) 로고만 떨어져 나와 실제 헤더 로고 자리로 앉는다.
 *
 * 스크롤 진행률은 헤더 위에 깔린 매우 긴 스페이서를 얼마나 지났는지로 계산하고
 * (스크롤 하이재킹 없음), 매 스크롤 이벤트 값을 그대로 쓰지 않고 rAF 루프로
 * 계속 완만하게 뒤쫓아가며(lerp) 적용해 트랙패드·휠 입력이 뚝뚝 끊겨도 매끄럽다.
 *
 * 재생 조건: localStorage의 tn_intro_seen이 없으면 재생, 있으면(이미 이 브라우저에서
 * 본 적 있으면) 건너뛴다 — 새로고침·재방문에도 유지된다. 다만 tn_intro_replay가
 * 서 있으면(가입 직후 SignupForm이 심어 둔다) seen과 무관하게 한 번 더 재생하고,
 * 끝나면 그 표시를 지운다. layout.tsx의 인라인 스크립트가 하이드레이션 전에
 * html[data-intro-seen]을 붙여, 이미 본 경우 첫 페인트부터 번쩍임 없이 숨긴다.
 */

const WORD = "TourNight";
const TOUR_LEN = 4; // "Tour"
const TYPE_INTERVAL_MS = 130;
const SPACER_VH = 480;
const SMOOTH_FACTOR = 0.12; // 클수록 즉각적, 작을수록 느긋하게 뒤쫓는다

const STAGE_A_END = 0.16; // 글자 낙하 소멸
const STAGE_B_END = 0.46; // 원 확대 → 화이트아웃
const STAGE_D_END = 0.72; // 문구 흑화
// 나머지 구간(~1.0)은 E: 검정 화면(+로고) 상승

const AMBER: [number, number, number] = [251, 191, 36];
const BLACK: [number, number, number] = [0, 0, 0];
const GRAY: [number, number, number] = [156, 163, 175];

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

/** 이 브라우저에서 건너뛰어야 하는지 — localStorage는 세션과 달리 새로고침·재방문에도
 * 남는다. replay 예약이 있으면 이미 봤어도 건너뛰지 않는다. 서버에서는 알 수 없어
 * 항상 "재생"으로 그렸다가 하이드레이션 후 맞춘다 — 실제 번쩍임은 레이아웃의 인라인
 * 스크립트(+ CSS)가 막는다 */
function useShouldSkip() {
  return useSyncExternalStore(
    () => () => {},
    () => {
      try {
        const replay = localStorage.getItem("tn_intro_replay") === "1";
        const seen = localStorage.getItem("tn_intro_seen") === "1";
        return seen && !replay;
      } catch {
        return false;
      }
    },
    () => false,
  );
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function lerpColor(c1: [number, number, number], c2: [number, number, number], t: number) {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

/** i번째 글자의 로컬 진행도 — 앞 글자부터 순서대로 끝난다 (뒷글자가 뒤따른다) */
function staggerLocal(globalP: number, total: number, i: number) {
  return clamp01(globalP * total - i);
}

export default function IntroSequence() {
  const reducedMotion = useReducedMotion();
  const shouldSkip = useShouldSkip();
  const t = useTranslations("intro");

  const [finished, setFinished] = useState(false);
  const [typedCount, setTypedCount] = useState(0);
  const [progress, setProgress] = useState(0); // 완만하게 뒤쫓는(smoothed) 값
  const [landing, setLanding] = useState(false);
  const [landStyle, setLandStyle] = useState<CSSProperties>({
    transform: "translate(-50%, -50%)",
  });

  const landedRef = useRef(false);
  const logoRef = useRef<HTMLSpanElement>(null);
  const rawProgressRef = useRef(0);
  const smoothProgressRef = useRef(0);

  // 타이핑이 다 끝났는지는 별도 상태 없이 글자 수로 그때그때 판단한다
  const phase0Done = typedCount >= WORD.length;
  const done = finished || shouldSkip || reducedMotion;

  const finish = useCallback(() => {
    try {
      localStorage.setItem("tn_intro_seen", "1");
      localStorage.removeItem("tn_intro_replay");
    } catch {}
    setFinished(true);
  }, []);

  const startLanding = useCallback(() => {
    setLanding(true);
    const target = document.querySelector<HTMLElement>("[data-header-logo]");
    const source = logoRef.current;
    if (target && source) {
      const targetRect = target.getBoundingClientRect();
      const sourceRect = source.getBoundingClientRect();
      const scale = sourceRect.height > 0 ? targetRect.height / sourceRect.height : 1;
      const dx = targetRect.left + targetRect.width / 2 - window.innerWidth / 2;
      const dy = targetRect.top + targetRect.height / 2 - window.innerHeight / 2;
      setLandStyle({
        transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${scale})`,
        transition: "transform 700ms cubic-bezier(0.22, 0.61, 0.36, 1)",
      });
    }
    window.setTimeout(finish, 720);
  }, [finish]);

  const triggerEnd = useCallback(() => {
    if (landedRef.current) return;
    landedRef.current = true;
    startLanding();
  }, [startLanding]);

  const handleSkip = useCallback(() => {
    if (landedRef.current) return;
    setTypedCount(WORD.length);
    rawProgressRef.current = 1;
    smoothProgressRef.current = 1;
    setProgress(1);
    // 리액트 렌더가 아직 안 반영된 사이 측정하지 않도록, 로고를 "다 올라온" 자리로
    // 먼저 직접 옮겨 둔다 (E 마지막 값과 같은 transform)
    if (logoRef.current) logoRef.current.style.transform = "translate(-50%, -50%)";
    triggerEnd();
  }, [triggerEnd]);

  // 타이핑 (스크롤과 무관, 자동 재생)
  useEffect(() => {
    if (done || typedCount >= WORD.length) return;
    const id = setTimeout(() => setTypedCount((n) => n + 1), TYPE_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [typedCount, done]);

  // 스크롤 → 목표 progress (ref에만 반영, 리렌더 없음). 타이핑이 끝나기 전에는
  // 스크롤해도 0으로 묶어 둔다
  useEffect(() => {
    if (done) return;
    const onScroll = () => {
      if (!phase0Done) {
        rawProgressRef.current = 0;
        return;
      }
      const max = window.innerHeight * (SPACER_VH / 100) - window.innerHeight;
      rawProgressRef.current = max > 0 ? clamp01(window.scrollY / max) : 1;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [done, phase0Done]);

  // 목표 progress를 매 프레임 완만하게 뒤쫓는다 — 스크롤 이벤트가 듬성듬성 와도
  // 화면은 끊기지 않고 계속 움직인다
  useEffect(() => {
    if (done) return;
    let raf = 0;
    const tick = () => {
      const raw = rawProgressRef.current;
      const cur = smoothProgressRef.current;
      const next = Math.abs(raw - cur) < 0.0006 ? raw : cur + (raw - cur) * SMOOTH_FACTOR;
      if (next !== cur) {
        smoothProgressRef.current = next;
        setProgress(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done]);

  // 화면이 다 올라오면(스크롤 없이) 곧바로 로고 착지로 이어간다
  useEffect(() => {
    if (!done && progress >= 1) triggerEnd();
  }, [progress, done, triggerEnd]);

  if (done) return null;

  const stageAProgress = clamp01(progress / STAGE_A_END);
  const stageBProgress = clamp01((progress - STAGE_A_END) / (STAGE_B_END - STAGE_A_END));
  const stageDProgress = clamp01((progress - STAGE_B_END) / (STAGE_D_END - STAGE_B_END));
  const stageEProgress = clamp01((progress - STAGE_D_END) / (1 - STAGE_D_END));

  const bgColor =
    progress < STAGE_A_END ? lerpColor(AMBER, BLACK, stageAProgress) : "rgb(0, 0, 0)";

  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;
  const diag = Math.hypot(vw, vh) * 1.2;
  const circleSize = progress < STAGE_A_END ? 0 : 16 + stageBProgress * (diag - 16);

  const lines = t("tagline").split("\n");
  const totalChars = lines.reduce((n, l) => n + l.length, 0);
  let charIndex = 0;

  // 화면(패널)과 그 위 로고를 정확히 같은 거리만큼 움직여야 "로고가 그려진 검정
  // 화면이 통째로 올라오는" 느낌이 난다. 패널은 자기 높이(=뷰포트) 기준 %로,
  // 로고는 글자 크기와 무관하게 항상 뷰포트 기준으로 움직여야 해서 vh를 쓴다
  const riseOffset = (1 - stageEProgress) * 100;

  return (
    <div data-intro-root>
      {/* 스크롤로 이 시퀀스를 밀고 지나갈 유효 구간 */}
      <div aria-hidden style={{ height: `${SPACER_VH}vh` }} />

      <div className="fixed inset-0 z-[100] overflow-hidden" style={{ backgroundColor: bgColor }}>
        {/* 0 / A — TourNight 타이핑 후 낙하 소멸 */}
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <p className="flex text-5xl font-extrabold tracking-tight sm:text-7xl">
            {WORD.split("").map((ch, i) => {
              if (i >= typedCount) return null;
              const local = staggerLocal(stageAProgress, WORD.length, i);
              return (
                <span
                  key={i}
                  className="inline-block"
                  style={{
                    color: i < TOUR_LEN ? "#ffffff" : "#000000",
                    opacity: 1 - local,
                    transform: `translateY(${local * 44}px)`,
                    filter: `blur(${local * 3}px)`,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </p>
        </div>

        {/* B — 흰 원이 커지며 화면을 덮는다 */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 rounded-full bg-white"
          style={{
            width: circleSize,
            height: circleSize,
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* D — 얇은 회색 문구, 앞 글자부터 검정으로 */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center"
          style={{ opacity: progress < STAGE_B_END ? 0 : 1 }}
        >
          {lines.map((line, li) => (
            <p key={li} className="font-thin tracking-tight text-2xl sm:text-4xl">
              {[...line].map((ch, ci) => {
                const idx = charIndex++;
                const local = staggerLocal(stageDProgress, totalChars, idx);
                return (
                  <span key={ci} style={{ color: lerpColor(GRAY, BLACK, local) }}>
                    {ch}
                  </span>
                );
              })}
            </p>
          ))}
        </div>

        {/* E — 로고가 그려진 검정 화면이 통째로 아래에서 위로 */}
        <div
          aria-hidden
          className="absolute inset-0 bg-black"
          style={{ transform: `translateY(${riseOffset}%)` }}
        />
        <span
          ref={logoRef}
          className="fixed left-1/2 top-1/2 whitespace-nowrap text-6xl font-extrabold tracking-tight sm:text-8xl"
          style={
            landing
              ? landStyle
              : { transform: `translate(-50%, -50%) translateY(${riseOffset}vh)` }
          }
        >
          <span className="text-white">Tour</span>
          <span className="text-amber-400">Night</span>
        </span>

        {!landing && (
          <button
            type="button"
            onClick={handleSkip}
            className="absolute bottom-6 left-1/2 z-[102] -translate-x-1/2 text-xs font-semibold tracking-wide text-white/50 transition hover:text-white"
          >
            {t("skip")}
          </button>
        )}
      </div>
    </div>
  );
}
