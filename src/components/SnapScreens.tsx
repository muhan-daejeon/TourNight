"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

const TRANSITION_MS = 300;

/** 이 정도 어긋나 있으면 "그 화면 맨 위"로 본다 (휠 델타 한 틱 정도의 여유) */
const EDGE_EPSILON = 4;

/** ease-in-out은 시작이 0속도라 "당겼다 놓는" 듯한 느낌이 난다 — 처음부터
 * 바로 움직이고 끝만 부드럽게 멎는 ease-out이 더 자연스럽다 */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * 홈의 두 화면(히어로 / 소식·가이드북) 전환.
 *
 * 안에 별도 스크롤 컨테이너를 두면(overflow-y-auto 박스) 그 박스 위에서만
 * 휠이 먹혀 "레이아웃이 하나 더 있는" 느낌이 난다 — 그래서 이 컴포넌트는 아무
 * 스타일도 없는 순수 래퍼일 뿐이고, 실제 전환은 window 전체에 건 휠 리스너로
 * document.scrollingElement를 움직인다. 마우스가 화면 어디에 있어도 똑같이 먹힌다.
 *
 * 첫 화면 맨 위에서 아래로 휠을 내리면(또는 둘째 화면 맨 위에서 위로 올리면)
 * 시간을 들여 애니메이션하고, 그 외의 스크롤(콘텐츠 화면 안, 푸터로 넘어가는 것)은
 * 그대로 브라우저 기본 동작에 맡긴다.
 */
export default function SnapScreens({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const animatingRef = useRef(false);

  const animateTo = useCallback((target: number) => {
    animatingRef.current = true;
    const start = window.scrollY;
    const delta = target - start;
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / TRANSITION_MS);
      window.scrollTo(0, start + delta * easeOutCubic(t));
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        animatingRef.current = false;
      }
    };
    requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const first = root?.children[0] as HTMLElement | undefined;
    const second = root?.children[1] as HTMLElement | undefined;
    if (!first || !second) return;

    // 헤더가 sticky라 뷰포트 위 headerHeight픽셀은 늘 헤더 차지다 — 화면이
    // "다 보이는" 지점은 문서 절대 위치가 아니라 거기서 헤더 높이를 뺀 값이다.
    // 안 빼면 둘째 화면이 그만큼 헤더 밑으로 파고든 채로 멈춘다.
    const headerHeight = () =>
      document.querySelector("header")?.getBoundingClientRect().height ?? 0;
    const restTop = (el: HTMLElement) =>
      el.getBoundingClientRect().top + window.scrollY - headerHeight();

    const onWheel = (e: WheelEvent) => {
      if (animatingRef.current) {
        e.preventDefault();
        return;
      }
      const firstRest = restTop(first);
      const secondRest = restTop(second);
      if (e.deltaY > 0 && Math.abs(window.scrollY - firstRest) <= EDGE_EPSILON) {
        e.preventDefault();
        animateTo(secondRest);
      } else if (e.deltaY < 0 && Math.abs(window.scrollY - secondRest) <= EDGE_EPSILON) {
        e.preventDefault();
        animateTo(firstRest);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });

    // ScrollDownHint 등 바깥 버튼이 같은 속도로 넘어가도록 요청하는 창구
    const onRequestNext = () => {
      if (!animatingRef.current) animateTo(restTop(second));
    };
    window.addEventListener("tn-snap-next", onRequestNext);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("tn-snap-next", onRequestNext);
    };
  }, [animateTo]);

  return <div ref={rootRef}>{children}</div>;
}
