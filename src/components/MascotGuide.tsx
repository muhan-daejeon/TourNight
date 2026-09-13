"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * 우측 하단 꿈돌이 안내 도우미 (피드백 12).
 *
 * 모든 페이지에 떠서, 지금 보고 있는 페이지가 뭐 하는 곳인지 말풍선으로
 * 한 줄씩 알려준다. 그림은 팀이 리포에 넣어둔 UFO 꿈돌이 에셋을 그대로 쓴다.
 * 인트로(우주선 비행)가 도는 첫 방문에는 비행이 끝나 이 자리에 착지한 뒤에
 * 나타난다 — tn-intro-done 이벤트가 그 신호다. 닫으면 이 세션 동안 숨긴다.
 */
const DOCK_EVENT = "tn-intro-done";
const HIDE_KEY = "tn-mascot-hidden";

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

export default function MascotGuide() {
  const t = useTranslations("mascotGuide");
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  // 닫힘 상태는 sessionStorage를 구독해 읽는다 — 서버 스냅샷은 "안 닫힘"이라
  // 하이드레이션이 안전하고, 효과 안에서 동기 setState를 할 필요도 없다
  const hidden = useSyncExternalStore(
    useCallback((onChange: () => void) => {
      window.addEventListener("tn-mascot-hide", onChange);
      return () => window.removeEventListener("tn-mascot-hide", onChange);
    }, []),
    () => {
      try {
        return sessionStorage.getItem(HIDE_KEY) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const hide = () => {
    try {
      sessionStorage.setItem(HIDE_KEY, "1");
    } catch {}
    window.dispatchEvent(new Event("tn-mascot-hide"));
  };

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

  if (hidden || !visible) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2">
      {/* 말풍선 — 페이지가 바뀌면 문구도 바뀐다 */}
      <div
        key={guideKey(pathname)}
        className="tn-bubble pointer-events-auto relative max-w-[240px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] leading-relaxed text-slate-700 shadow-[0_8px_28px_rgba(15,23,42,0.14)]"
      >
        {t(guideKey(pathname))}
        <button
          type="button"
          onClick={hide}
          aria-label="close"
          className="absolute -right-1.5 -top-1.5 rounded-full border border-slate-200 bg-white p-1 text-slate-400 shadow transition hover:text-slate-700"
        >
          <X size={11} />
        </button>
        {/* 꼬리 */}
        <span className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 border-b border-r border-slate-200 bg-white" />
      </div>

      {/* 홈에서는 꿈돌이를 누르면 온보딩 둘러보기가 재생된다 (마이페이지
          '둘러보기 다시 보기'와 동일 동작 - ?tour=start) */}
      <button
        type="button"
        onClick={() => {
          if (guideKey(pathname) === "home") router.push("/?tour=start");
        }}
        className={`tn-float pointer-events-auto ${guideKey(pathname) === "home" ? "cursor-pointer" : "cursor-default"}`}
        aria-label="꿈돌이"
      >
        <Image
          src="/mascot-ufo.png"
          alt="꿈돌이"
          width={112}
          height={86}
          className="h-auto w-24 drop-shadow-[0_10px_20px_rgba(15,23,42,0.25)] sm:w-28"
        />
      </button>

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
      `}</style>
    </div>
  );
}
