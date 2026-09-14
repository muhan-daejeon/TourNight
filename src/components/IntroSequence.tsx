"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { appAlreadyCommitted } from "@/lib/app-boot";

/**
 * 홈 진입 인트로 — 아주 짧게: 검정 화면이 잠깐 나왔다가, 점점 옅어지며 홈
 * 화면이 드러난다. 그 옅어지는 순간 우측 상단에서 꿈돌우주(ggumdol-space.png)
 * 가 작게 나타나 점점 커지며 화면 세로 중앙·가로로는 좌측까지 이동했다가,
 * 다시 작아지며 우측 하단(MascotGuide가 서는 자리)에 착지한다. 착지하면
 * tn-intro-done을 쏘고 MascotGuide가 그 자리에서 이어받는다 — 인트로가
 * 재생되는 동안에는(착지 전까지는) 화면에 마스코트를 따로 두지 않는다.
 * 사용자 입력(스크롤·클릭) 없이 자동으로 재생된다.
 *
 * 재생 조건 — 다음 중 하나라도 해당하면 재생하지 않는다:
 *   1. 로그인·가입 직후(?skipIntro=1).
 *   2. 같은 문서에서 라우터로 돌아온 경우(appAlreadyCommitted) — 다른
 *      메뉴에서 홈으로 이동하거나 좌측 상단 로고를 클릭한 경우도 포함(둘 다
 *      Link를 통한 같은 문서 내 이동이라 이 판정 하나로 같이 걸러진다).
 *   3. OS '동작 줄이기' 설정.
 * 이 세 경우가 아니면 — 새로고침이든 새 탭이든 주소창 직접 입력이든 — 이
 * 문서를 "진짜로" 새로 여는 매 순간마다 재생된다(영구 기억 없음).
 */

const BLACK_HOLD_MS = 500; // 검정 화면이 잠깐 그대로 머무는 시간
const REVEAL_MS = 600; // 검정 화면이 점점 옅어지며 홈이 드러나는 시간
const MASCOT_FLIGHT_MS = 2400;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

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

export default function IntroSequence({ skipIntro }: { skipIntro: boolean }) {
  const reducedMotion = useReducedMotion();
  const [isSpaRevisit] = useState(() => appAlreadyCommitted);

  const [revealing, setRevealing] = useState(false);
  const [overlayGone, setOverlayGone] = useState(false);
  const [mascotDone, setMascotDone] = useState(false);
  const doneFiredRef = useRef(false);

  const done = mascotDone || skipIntro || isSpaRevisit || reducedMotion;

  // 로그인·가입 리다이렉트를 표시하던 쿼리는 한 번 쓰고 지운다 — 안 지우면 이
  // 주소 그대로 새로고침할 때도 인트로가 계속 안 뜬다
  useEffect(() => {
    if (!skipIntro) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("skipIntro");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [skipIntro]);

  const completeIntro = useCallback(() => {
    if (doneFiredRef.current) return;
    doneFiredRef.current = true;
    setMascotDone(true);
    window.dispatchEvent(new Event("tn-intro-done"));
  }, []);

  // 검정 화면이 잠깐 머물다가 옅어지기 시작(= 마스코트 비행도 이때 함께 시작)
  useEffect(() => {
    if (done) return;
    const id = setTimeout(() => setRevealing(true), BLACK_HOLD_MS);
    return () => clearTimeout(id);
  }, [done]);

  // 옅어지기 시작하면 다 옅어진 뒤 레이어를 걷어낸다(마스코트 비행은 별도
  // 레이어라 계속된다 — 실제 홈 화면 위를 날아가는 것처럼 보인다)
  useEffect(() => {
    if (!revealing) return;
    const id = setTimeout(() => setOverlayGone(true), REVEAL_MS);
    return () => clearTimeout(id);
  }, [revealing]);

  // 마스코트가 자리에 착지하면 완료 처리
  useEffect(() => {
    if (!revealing) return;
    const id = setTimeout(completeIntro, MASCOT_FLIGHT_MS);
    return () => clearTimeout(id);
  }, [revealing, completeIntro]);

  if (done) return null;

  return (
    <>
      {!overlayGone && (
        <div
          className="fixed inset-0 z-[100] bg-black"
          style={{ opacity: revealing ? 0 : 1, transition: `opacity ${REVEAL_MS}ms ease` }}
        />
      )}

      {revealing && !mascotDone && (
        // MascotGuide와 같은 고정 좌표(bottom-5 right-5)를 기준점으로 두고,
        // keyframes의 translate가 그 기준에서 얼마나 떨어져 있는지를 그린다 —
        // 애니메이션이 끝나는 지점이 곧 도우미가 나타나는 자리다
        <div className="tn-mascot-flight pointer-events-none fixed bottom-5 right-5 z-[70]">
          <Image
            src="/menu-panel/ggumdol-space.png"
            alt=""
            width={560}
            height={418}
            priority
            className="h-auto w-24 drop-shadow-[0_12px_26px_rgba(15,23,42,0.3)] sm:w-28"
          />
        </div>
      )}

      <style>{`
        .tn-mascot-flight {
          animation: tn-mascot-flight ${MASCOT_FLIGHT_MS}ms cubic-bezier(0.45, 0.05, 0.35, 1) both;
        }
        @keyframes tn-mascot-flight {
          /* 우측 상단에서 작게 나타난다 */
          0% { transform: translate(-8vw, -85vh) scale(0.28); opacity: 0; }
          10% { opacity: 1; }
          /* 커지면서 세로 중앙·가로로는 좌측까지 이동 */
          48% { transform: translate(-68vw, -46vh) scale(2.6); }
          /* 다시 작아지며 우측 하단(도우미 자리)에 착지 */
          100% { transform: translate(0, 0) scale(1); }
        }
      `}</style>
    </>
  );
}
