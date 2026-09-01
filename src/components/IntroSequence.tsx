"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useTranslations } from "next-intl";
import { appAlreadyCommitted } from "@/lib/app-boot";

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
 * 화면을 클릭해도(스크롤 대신/추가로) 다음 단계 경계까지 진행된다 — 실제
 * scrollY는 그대로 두고 "가상 오프셋"만 늘려서, 클릭 이후 이어지는 진짜
 * 스크롤도 그 앞당겨진 지점부터 자연스럽게 계속된다.
 *
 * 재생 조건: 이 문서를 "진짜로" 새로 열 때만 재생한다 — 새로고침·새 탭·주소
 * 직접 입력. 세 가지는 재생하지 않는다:
 *   1. 로그인·가입·로그아웃 직후 — 그 리다이렉트들만 홈 URL에 ?skipIntro=1을
 *      붙이고, page.tsx(서버 컴포넌트)가 그 쿼리를 보고 skipIntro prop을 내려준다.
 *      서버가 처음부터 판단해 내려주므로 클라이언트가 나중에 "사실 껐어야
 *      했다"며 지우는 과정이 없어 노란 화면이 한 프레임 그려졌다 사라지는
 *      깜빡임도 없다.
 *   2. 로고 클릭 등 같은 문서 안에서 라우터로(SPA 이동) 홈에 온 경우 — 다른
 *      페이지에서 출발했든, 그 페이지가 마침 홈이었지만 라우터로 다시 돌아온
 *      것이든 상관없다. lib/app-boot.ts의 appAlreadyCommitted가 그 구분자다:
 *      "이 문서에서 뭔가 한 번이라도 커밋된 적 있는지"를 모든 페이지에 있는
 *      Header가 표시해 둔다. 진짜 처음 여는 하이드레이션의 그 첫 커밋 "안"에서는
 *      아직 아무것도 커밋 전이라 인트로도 false를 보고(서버가 렌더한 값과 같아
 *      깜빡임 없음), 그 뒤 라우터로 홈에 올 때만(이미 커밋이 끝난 뒤이므로)
 *      true를 본다. localStorage처럼 "본 적 있음"을 영구히 남기지는 않는다 —
 *      그러면 다음 새로고침부터도 안 뜨게 되어 버려서, 딱 이 문서가 열려 있는
 *      동안만 기억한다.
 *   3. '동작 줄이기'를 켠 경우.
 */

const WORD = "TourNight";
const TOUR_LEN = 4; // "Tour"
const TYPE_INTERVAL_MS = 130;
const SPACER_VH = 800;
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

export default function IntroSequence({ skipIntro }: { skipIntro: boolean }) {
  const reducedMotion = useReducedMotion();
  // 렌더 중 한 번만 읽어 고정한다(StrictMode가 두 번 불러도 순수한 읽기라 무해하다).
  // 마운트 이후 다른 페이지에서 커밋이 일어나 값이 바뀌어도 이미 재생 중인 이
  // 인스턴스의 판단은 바뀌지 않는다 — 그럴 필요도 없다
  const [isSpaRevisit] = useState(() => appAlreadyCommitted);
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
  // 클릭으로 앞당긴 만큼의 "가상 스크롤" 거리(px). 실제 scrollY에 이 값을 더해서
  // progress를 구하므로, 클릭 이후에도 진짜 스크롤이 그 위에 자연스럽게 이어진다
  const clickOffsetRef = useRef(0);
  // 더블클릭은 브라우저가 'click'을 두 번 쏘고 나서 dblclick을 보낸다 — 한 번
  // 누른다고 생각한 클릭이 실제로는 두세 번 잡혀 단계를 몇 개씩 건너뛰던 걸
  // 막는다 (마지막 처리로부터 이 시간 안의 추가 클릭은 무시)
  const lastAdvanceAtRef = useRef(0);

  // 타이핑이 다 끝났는지는 별도 상태 없이 글자 수로 그때그때 판단한다
  const phase0Done = typedCount >= WORD.length;
  const done = finished || reducedMotion || skipIntro || isSpaRevisit;

  // 로그인·가입 리다이렉트를 표시하던 쿼리는 한 번 쓰고 지운다 — 안 지우면 이
  // 주소 그대로 새로고침할 때도 계속 인트로가 안 뜬다("새로고침하면 뜬다"는
  // 요청과 어긋난다). 화면에 보이는 것과는 무관해 주소만 조용히 바꾼다
  useEffect(() => {
    if (!skipIntro) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("skipIntro");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [skipIntro]);

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

  // 새로고침 등으로 브라우저가 이전 스크롤 위치를 되살려 놓으면, 인트로가 이미
  // 스크롤한 것처럼 중간부터 시작해 버린다. 뜨기 전에 맨 위로 되돌리고, 떠
  // 있는 동안은 브라우저가 다시 되살리지 못하게 막는다 (끝나면 원래대로 복구)
  useLayoutEffect(() => {
    if (done) return;
    const prevRestoration = "scrollRestoration" in history ? history.scrollRestoration : null;
    if (prevRestoration) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    return () => {
      if (prevRestoration) history.scrollRestoration = prevRestoration;
    };
  }, [done]);

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
  // 스크롤해도 0으로 묶어 둔다. clickOffsetRef만큼 "미리 스크롤한 셈" 쳐서 더한다
  useEffect(() => {
    if (done) return;
    const onScroll = () => {
      if (!phase0Done) {
        rawProgressRef.current = 0;
        return;
      }
      const max = window.innerHeight * (SPACER_VH / 100) - window.innerHeight;
      // max가 0 이하로 잡히는 건 뷰포트를 순간적으로 잘못 잰 것뿐이지 "끝까지
      // 스크롤했다"는 뜻이 아니다. 예전엔 이럴 때 무조건 1(=완료)로 떨어뜨려서,
      // 그 순간이 한 번만 스쳐도 스크롤 한 번에 인트로가 통째로 끝나 버렸다
      if (max <= 0) return;
      const virtual = window.scrollY + clickOffsetRef.current;
      rawProgressRef.current = clamp01(virtual / max);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [done, phase0Done]);

  // 화면을 클릭하면 스크롤 없이도 다음 단계(경계값)까지 밀어준다. 실제 scrollY는
  // 그대로 두고 clickOffsetRef만 늘려서, 그 뒤에 이어지는 진짜 스크롤이 이
  // 앞당긴 지점부터 자연스럽게 계속되게 한다
  const handleAdvance = useCallback(() => {
    if (!phase0Done || landedRef.current) return;
    const now = Date.now();
    if (now - lastAdvanceAtRef.current < 500) return;
    lastAdvanceAtRef.current = now;
    const boundaries = [STAGE_A_END, STAGE_B_END, STAGE_D_END, 1];
    const next = boundaries.find((b) => b > rawProgressRef.current + 0.001) ?? 1;
    const max = window.innerHeight * (SPACER_VH / 100) - window.innerHeight;
    if (max <= 0) return; // 뷰포트를 순간적으로 잘못 잰 경우 — onScroll과 같은 이유로 무시
    clickOffsetRef.current = next * max - window.scrollY;
    rawProgressRef.current = next;
  }, [phase0Done]);

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

      <div
        className="fixed inset-0 z-[100] overflow-hidden"
        style={{ backgroundColor: bgColor }}
        onClick={handleAdvance}
      >
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
            onClick={(e) => {
              // 바깥 div의 onClick(handleAdvance)까지 겹쳐 실행되지 않도록 막는다
              e.stopPropagation();
              handleSkip();
            }}
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
