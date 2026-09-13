"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { appAlreadyCommitted } from "@/lib/app-boot";

/**
 * 홈 진입 인트로 — UFO 꿈돌이 비행.
 *
 * 커튼처럼 화면을 가리는 대신, 팀 에셋(UFO 꿈돌이)이 화면 왼쪽 위에서
 * 슝 날아와 곡선을 그리며 우측 하단 — 페이지 안내 도우미(MascotGuide)가
 * 서는 바로 그 자리 — 에 착지한다. 착지하면 tn-intro-done 이벤트를 쏘고,
 * MascotGuide가 그 자리에서 말풍선과 함께 이어받는다.
 *
 * 화면을 막지 않으므로(포인터 통과) 건너뛰기가 따로 필요 없고, 재생 조건은
 * 기존 인트로와 동일하다:
 *   1. 로그인·가입 직후(?skipIntro=1)는 재생하지 않는다.
 *   2. 같은 문서에서 라우터로 돌아온 경우(appAlreadyCommitted)도 재생하지 않는다.
 *   3. OS '동작 줄이기' 설정 시 재생하지 않는다.
 */

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const FLIGHT_MS = 2400;

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
  const [done, setDone] = useState(false);

  const active = !skipIntro && !isSpaRevisit && !reducedMotion && !done;

  // 비행이 끝나면 도우미에게 자리를 넘긴다
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => {
      setDone(true);
      window.dispatchEvent(new Event("tn-intro-done"));
    }, FLIGHT_MS + 120);
    return () => window.clearTimeout(id);
  }, [active]);

  if (!active) return null;

  return (
    // MascotGuide와 같은 고정 좌표(bottom-5 right-5)를 기준점으로 두고,
    // keyframes의 translate가 그 기준에서 얼마나 떨어져 있는지를 그린다 —
    // 애니메이션이 끝나는 지점이 곧 도우미가 나타나는 자리다
    <div className="tn-ufo pointer-events-none fixed bottom-5 right-5 z-[70]">
      <Image
        src="/mascot-ufo.png"
        alt=""
        width={112}
        height={86}
        priority
        className="h-auto w-24 drop-shadow-[0_12px_26px_rgba(15,23,42,0.3)] sm:w-28"
      />
      <style>{`
        .tn-ufo {
          animation: tn-ufo-flight ${FLIGHT_MS}ms cubic-bezier(0.45, 0.05, 0.35, 1) both;
        }
        @keyframes tn-ufo-flight {
          0% {
            transform: translate(-58vw, -60vh) rotate(-12deg) scale(3);
            opacity: 0;
          }
          14% { opacity: 1; }
          38% {
            transform: translate(-42vw, -42vh) rotate(7deg) scale(2.5);
          }
          72% {
            transform: translate(-11vw, -12vh) rotate(-6deg) scale(1.35);
          }
          90% {
            transform: translate(0.9rem, 0.5rem) rotate(3deg) scale(1.05);
          }
          100% {
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
