"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import PhrasebookSection from "./PhrasebookSection";

/**
 * 우측 하단 꿈돌이 안내 도우미 (피드백 12) + 그 옆의 꿈순이.
 *
 * 꿈돌이는 모든 페이지에 떠서, 지금 보고 있는 페이지가 뭐 하는 곳인지
 * 말풍선으로 한 줄씩 알려준다. 꿈순이는 꿈돌이 옆에 0.7배 크기로 붙어
 * 뜨고(둘이 같은 바닥에 떠 있는 느낌이 나도록 둘 다 아래로 정렬), 말풍선은
 * 페이지와 상관없이 항상 같은 문구다. 꿈순이를 누르면 "서바이벌 한국어"
 * 전체(에티켓 페이지 하단과 같은 내용)가 팝업으로 뜬다.
 *
 * 말풍선의 X를 누르면 완전히 사라지는 대신, 화면 세로 중앙·오른쪽 끝으로
 * 작아지며 이동해 작은 탭(미니 꿈돌이/꿈순이)으로 접힌다 — 다시 누르면
 * 원래 자리로 돌아온다. 꿈순이 탭이 위, 꿈돌이 탭이 그 바로 아래로 겹치지
 * 않게 쌓인다.
 *
 * 그림은 팀이 리포에 넣어둔 UFO 꿈돌이·꿈순이 + 미니 에셋을 그대로 쓴다.
 * 인트로(우주선 비행)가 도는 첫 방문에는 비행이 끝나 이 자리에 착지한 뒤에
 * 둘 다 나타난다 — tn-intro-done 이벤트가 그 신호다.
 */
const DOCK_EVENT = "tn-intro-done";
/** 접혔다 펴지는 애니메이션 재생 시간 — 그 사이엔 도킹된 모습으로 두고 있다가 끝나면 접는다 */
const FLY_MS = 380;

/** 경로 → 안내 문구 키 */
function guideKey(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/spots")) return "spots";
  if (pathname.startsWith("/festivals")) return "festivals";
  if (pathname.startsWith("/courses")) return "courses";
  if (pathname.startsWith("/personality")) return "personality";
  if (pathname.startsWith("/etiquette")) return "etiquette";
  if (pathname.startsWith("/klife")) return "klife";
  if (pathname.startsWith("/community")) return "community";
  if (pathname.startsWith("/stamp-tour")) return "stampTour";
  if (pathname.startsWith("/night-bike")) return "nightBike";
  return "default";
}

/** 꿈순이를 누르면 뜨는 팝업 — "서바이벌 한국어"(에티켓 페이지 하단과 같은 내용) */
function GgumsunPopup({ onClose }: { onClose: () => void }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] overflow-y-auto bg-white/90 p-4 py-8 backdrop-blur-sm"
    >
      <div className="relative mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-5 top-5 text-slate-500 transition hover:text-slate-900"
        >
          <X size={16} />
        </button>
        <PhrasebookSection />
      </div>
    </div>,
    document.body,
  );
}

export default function MascotGuide() {
  const t = useTranslations("mascotGuide");
  const tGgumsun = useTranslations("ggumsunGuide");
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  // minimized: 화면 오른쪽 끝 세로 중앙에 미니 탭으로 접힌 상태
  // leaving: 접히는 애니메이션이 도는 중(그동안은 아직 도킹된 자리에서 빠져나가는 모습)
  const [ggumsunMinimized, setGgumsunMinimized] = useState(false);
  const [ggumsunLeaving, setGgumsunLeaving] = useState(false);
  const [ggumdolMinimized, setGgumdolMinimized] = useState(false);
  const [ggumdolLeaving, setGgumdolLeaving] = useState(false);

  function minimizeGgumsun() {
    setGgumsunLeaving(true);
    window.setTimeout(() => {
      setGgumsunMinimized(true);
      setGgumsunLeaving(false);
    }, FLY_MS);
  }
  function minimizeGgumdol() {
    setGgumdolLeaving(true);
    window.setTimeout(() => {
      setGgumdolMinimized(true);
      setGgumdolLeaving(false);
    }, FLY_MS);
  }

  useEffect(() => {
    // 인트로 비행이 끝나면 그 자리에서 이어받는다. 인트로가 없는 경우
    // (SPA 이동·가입 직후·동작 줄이기)를 위해 짧은 타이머도 함께 건다
    const show = () => setVisible(true);
    window.addEventListener(DOCK_EVENT, show);
    const fallback = window.setTimeout(show, 3400);
    return () => {
      window.removeEventListener(DOCK_EVENT, show);
      window.clearTimeout(fallback);
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* 꿈순이 — 화면 왼쪽 하단에 따로 뜬다(꿈돌이 옆에 붙여 두면 둘이
          겹쳐 보인다는 피드백). 말풍선은 페이지와 상관없이 항상 같은 문구 */}
      {!ggumsunMinimized && (
        <div className="pointer-events-none fixed bottom-5 left-5 z-[60] flex flex-col items-start gap-2">
          {!ggumsunLeaving && (
            <div className="tn-bubble pointer-events-auto relative max-w-[200px] rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] leading-relaxed text-slate-700 shadow-[0_8px_28px_rgba(15,23,42,0.14)]">
              {tGgumsun("bubble")}
              <button
                type="button"
                onClick={minimizeGgumsun}
                aria-label="close"
                className="absolute -right-1.5 -top-1.5 rounded-full border border-slate-200 bg-white p-1 text-slate-400 shadow transition hover:text-slate-700"
              >
                <Image
                  src="/menu-panel/ggumsun-space1.png"
                  alt="꿈순이"
                  width={584}
                  height={486}
                  priority
                  className="h-auto w-[4.2rem] drop-shadow-[0_10px_20px_rgba(15,23,42,0.25)] sm:w-[4.9rem]"
                />
                <X size={10} />
              </button>
              <span className="absolute -bottom-1.5 left-6 h-2.5 w-2.5 rotate-45 border-b border-r border-slate-200 bg-white" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setPopupOpen(true)}
            className={`pointer-events-auto cursor-pointer ${ggumsunLeaving ? "tn-fly-out-left" : "tn-float"}`}
            aria-label="꿈순이"
          >
            <Image
              src="/menu-panel/ggumsun-space.png"
              alt="꿈순이"
              width={584}
              height={486}
              priority
              className="h-auto w-[4.2rem] drop-shadow-[0_10px_20px_rgba(15,23,42,0.25)] sm:w-[4.9rem]"
            />
          </button>
        </div>
      )}

      {/* 꿈돌이 — 우측 하단, 페이지마다 문구가 바뀐다 */}
      {!ggumdolMinimized && (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2">
          {!ggumdolLeaving && (
            <div
              key={guideKey(pathname)}
              className="tn-bubble pointer-events-auto relative max-w-[240px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] leading-relaxed text-slate-700 shadow-[0_8px_28px_rgba(15,23,42,0.14)]"
            >
              {t(guideKey(pathname))}
              <button
                type="button"
                onClick={minimizeGgumdol}
                aria-label="close"
                className="absolute -right-1.5 -top-1.5 rounded-full border border-slate-200 bg-white p-1 text-slate-400 shadow transition hover:text-slate-700"
              >
                <X size={11} />
              </button>
              {/* 꼬리 */}
              <span className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 border-b border-r border-slate-200 bg-white" />
            </div>
          )}

          {/* 홈에서는 꿈돌이를 누르면 온보딩 둘러보기가 재생된다 (마이페이지
              '둘러보기 다시 보기'와 동일 동작 - ?tour=start) */}
          <button
            type="button"
            onClick={() => {
              if (guideKey(pathname) === "home") router.push("/?tour=start");
            }}
            className={`pointer-events-auto ${ggumdolLeaving ? "tn-fly-out" : "tn-float"} ${guideKey(pathname) === "home" ? "cursor-pointer" : "cursor-default"}`}
            aria-label="꿈돌이"
          >
            <Image
              src="/menu-panel/ggumdol-space.png"
              alt="꿈돌이"
              width={560}
              height={418}
              priority
              className="h-auto w-24 drop-shadow-[0_10px_20px_rgba(15,23,42,0.25)] sm:w-28"
            />
          </button>
        </div>
      )}

      {/* 접힌 모습 — 꿈순이는 화면 왼쪽, 꿈돌이는 오른쪽 끝(둘 다 세로 중앙)
          으로 각자 접힌다 — 도킹된 자리와 같은 쪽으로 접혀야 자연스럽다.
          눌러서 원래 자리로 되돌릴 수 있다 */}
      {ggumsunMinimized && (
        <div className="pointer-events-none fixed left-0 top-1/2 z-[60] -translate-y-1/2">
          <button
            type="button"
            onClick={() => setGgumsunMinimized(false)}
            aria-label="꿈순이"
            className="tn-fly-in-left pointer-events-auto"
          >
            <Image
              src="/menu-panel/ggumsun-mini.png"
              alt="꿈순이"
              width={385}
              height={437}
              priority
              className="h-auto w-14 drop-shadow-[0_10px_20px_rgba(15,23,42,0.25)] sm:w-16"
            />
          </button>
        </div>
      )}
      {ggumdolMinimized && (
        <div className="pointer-events-none fixed right-0 top-1/2 z-[60] -translate-y-1/2">
          <button
            type="button"
            onClick={() => setGgumdolMinimized(false)}
            aria-label="꿈돌이"
            className="tn-fly-in pointer-events-auto"
          >
            <Image
              src="/menu-panel/ggumdol-mini.png"
              alt="꿈돌이"
              width={405}
              height={464}
              priority
              className="h-auto w-14 drop-shadow-[0_10px_20px_rgba(15,23,42,0.25)] sm:w-16"
            />
          </button>
        </div>
      )}

      {popupOpen && <GgumsunPopup onClose={() => setPopupOpen(false)} />}

      <style>{`
        .tn-float { animation: tn-float 3s ease-in-out infinite; }
        @keyframes tn-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        .tn-bubble { animation: tn-bubble-in 0.35s ease-out; }
        @keyframes tn-bubble-in {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .tn-fly-out { animation: tn-fly-out ${FLY_MS}ms ease-in forwards; }
        @keyframes tn-fly-out {
          to { transform: translate(60px, -140px) scale(0.35); opacity: 0; }
        }
        .tn-fly-in { animation: tn-fly-in ${FLY_MS}ms ease-out; }
        @keyframes tn-fly-in {
          from { transform: translateX(30px) scale(0.7); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
        /* 꿈순이는 왼쪽에 떠 있으니, 접히고 펴지는 방향도 왼쪽 기준으로 뒤집는다 */
        .tn-fly-out-left { animation: tn-fly-out-left ${FLY_MS}ms ease-in forwards; }
        @keyframes tn-fly-out-left {
          to { transform: translate(-60px, -140px) scale(0.35); opacity: 0; }
        }
        .tn-fly-in-left { animation: tn-fly-in-left ${FLY_MS}ms ease-out; }
        @keyframes tn-fly-in-left {
          from { transform: translateX(-30px) scale(0.7); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
