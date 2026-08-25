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
 * 재생 조건: 진짜로(브라우저가 문서를 새로) 홈에 들어올 때만 재생한다. 다른 메뉴를
 * 보다가 라우터로(클라이언트 사이드 내비게이션) 홈에 돌아온 것은 "새로 접속"이
 * 아니므로 건너뛴다 — moduleAlreadyRan이 그 구분자다: 새로고침/새 탭처럼 이 모듈이
 * 처음부터 다시 평가될 때만 false로 시작하고, 라우터 이동으로는 리셋되지 않는다.
 * '동작 줄이기'를 켠 경우에도 건너뛴다.
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

// 브라우저 쪽 모듈 스코프 — 진짜 새 문서 로드(새로고침·새 탭·주소 직접 입력)에서만
// 다시 false로 초기화된다. 같은 로드 안에서 라우터로 페이지를 옮겨 다녀도 이 값은
// 그대로 살아있어, 홈으로 되돌아와도 재생하지 않는다.
//
// 이 값은 오직 클라이언트(useSyncExternalStore의 getSnapshot)에서만 읽고 쓴다.
// getServerSnapshot에서 건드리면 안 된다 — 서버 렌더는 (개발 서버가 오래 떠
// 있는 동안) 여러 요청이 같은 Node 모듈 인스턴스를 공유해서, 한 번이라도
// 여기서 true로 바뀌면 그 뒤 모든 사용자의 첫 방문까지 인트로가 안 뜨게 된다.
let moduleAlreadyRan = false;

/** 이 마운트가 "새 문서 로드에서의 첫 마운트"인지 — 라우터로 돌아온 재마운트면 true */
function useIsSpaRevisit() {
  const capturedRef = useRef<boolean | undefined>(undefined);
  return useSyncExternalStore(
    () => () => {},
    () => {
      // useSyncExternalStore는 같은 렌더 안에서 getSnapshot을 여러 번 부를 수 있어
      // (tearing 감지) 매번 새로 읽고 쓰면 두 번째 호출부터 값이 달라져 버린다 —
      // ref로 한 번만 확정한다
      if (capturedRef.current === undefined) {
        capturedRef.current = moduleAlreadyRan;
        moduleAlreadyRan = true;
      }
      return capturedRef.current;
    },
    () => false,
  );
}

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
  const isSpaRevisit = useIsSpaRevisit();
  const t = useTranslations("intro");

  const [finished, setFinished] = useState(false);
  const [typedCount, setTypedCount] = useState(0);
  const [progress, setProgress] = useState(0); // 완만하게 뒤쫓는(smoothed) 값
  const [landing, setLanding] = useState(false);
  const [landStyle, setLandStyle] = useState<CSSProperties>({
    transform: "translate(-50%, -50%)",
  });
  // 원의 최대 크기 계산용. 서버는 실제 뷰포트를 몰라 고정값으로 그리고, 마운트
  // 후에만 진짜 크기로 맞춘다 — 처음부터 window.innerWidth를 쓰면 서버가 그린
  // 값과 달라져 하이드레이션 경고가 난다 (이 값은 원이 사실상 안 보이는
  // 단계에서만 쓰이므로, 하이드레이션 뒤 한 번 갱신되는 건 눈에 띄지 않는다)
  const [viewport, setViewport] = useState({ w: 1920, h: 1080 });

  const landedRef = useRef(false);
  const logoRef = useRef<HTMLSpanElement>(null);
  const rawProgressRef = useRef(0);
  const smoothProgressRef = useRef(0);

  // 타이핑이 다 끝났는지는 별도 상태 없이 글자 수로 그때그때 판단한다
  const phase0Done = typedCount >= WORD.length;
  const done = finished || reducedMotion || isSpaRevisit;

  const finish = useCallback(() => {
    // 스크롤로 여기까지 밀고 온 거리(스페이서)가 이 순간 통째로 사라지므로,
    // 그대로 두면 브라우저가 스크롤 위치를 억지로 맞추다 화면 2(콘텐츠)에
    // 떨어뜨린다. 커튼이 아직 화면을 완전히 덮은 채라 이 점프는 보이지 않는다
    window.scrollTo(0, 0);
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

  // 실제 뷰포트 크기로 갱신 (마운트 후 1회 + 크기 변경 시)
  useEffect(() => {
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

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

  const diag = Math.hypot(viewport.w, viewport.h) * 1.2;
  // 원은 항상 diag 크기로 놓아두고 scale()만 바꾼다 — width/height를 매 프레임
  // 바꾸면 레이아웃을 다시 계산해야 해서(리플로) 뚝뚝 끊긴다. scale은 합성 단계
  // (컴포지터)에서만 처리돼 훨씬 매끄럽다
  const circleScale = progress < STAGE_A_END ? 0 : (16 + stageBProgress * (diag - 16)) / diag;

  const lines = t("tagline").split("\n");
  const totalChars = lines.reduce((n, l) => n + l.length, 0);
  let charIndex = 0;

  // 화면(패널)과 그 위 로고를 정확히 같은 거리만큼 움직여야 "로고가 그려진 검정
  // 화면이 통째로 올라오는" 느낌이 난다. 패널은 자기 높이(=뷰포트) 기준 %로,
  // 로고는 글자 크기와 무관하게 항상 뷰포트 기준으로 움직여야 해서 vh를 쓴다
  const riseOffset = (1 - stageEProgress) * 100;

  return (
    <div>
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
                    // translateY만 쓴다 — blur는 프레임마다 여러 글자를 동시에
                    // 다시 흐리게 그려야 해서(레이어 리페인트) 버벅임의 흔한 원인이다
                    transform: `translateY(${local * 44}px)`,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </p>
        </div>

        {/* B — 흰 원이 커지며 화면을 덮는다 (크기는 고정, scale만 애니메이션) */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 rounded-full bg-white"
          style={{
            width: diag,
            height: diag,
            transform: `translate(-50%, -50%) scale(${circleScale})`,
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

        {/* 스크롤로 진행하는 구간(타이핑이 끝난 뒤부터 착지 전까지) 내내 아주
            옅게 안내한다. 배경이 노랑→검정→흰색→검정으로 계속 바뀌므로 고정
            색 대신 blend-mode로 어떤 배경에서도 옅게나마 보이게 한다 */}
        {phase0Done && !landing && (
          <p
            aria-hidden
            className="absolute bottom-12 left-1/2 z-[102] -translate-x-1/2 text-[10px] font-semibold tracking-[0.3em] text-white/40"
            style={{ mixBlendMode: "difference" }}
          >
            {t("scrollDown")}
          </p>
        )}

        {!landing && (
          <button
            type="button"
            onClick={handleSkip}
            className="absolute bottom-6 left-1/2 z-[102] -translate-x-1/2 text-xs font-semibold tracking-wide text-white/50 transition hover:text-white"
            style={{ mixBlendMode: "difference" }}
          >
            {t("skip")}
          </button>
        )}
      </div>
    </div>
  );
}
