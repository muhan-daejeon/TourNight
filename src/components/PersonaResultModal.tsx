"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { ArrowRight, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { PersonalityType } from "@/lib/personality-test";
import PersonalityResultView from "./PersonalityResultView";

interface SavedResult {
  primary: PersonalityType;
  secondary: PersonalityType | null;
  scores: Record<PersonalityType, number>;
}

/**
 * 프로필의 "내 여행 성향 확인하기" 팝업.
 *
 * 가장 최근 성향 테스트 결과를 처음부터 다 펼쳐서 보여준다(성향 요약·상세
 * 분석·특징/추천 코스/추천 스팟/여행 팁 전부) — PersonalityTest.tsx가 결과
 * 화면에서 쓰는 것과 같은 PersonalityResultView를 expanded로 쓴다.
 */
export default function PersonaResultModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("personality");
  const [state, setState] = useState<"loading" | "empty" | "ready">("loading");
  const [data, setData] = useState<SavedResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/personality/latest")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.result) {
          setData(d.result);
          setState("ready");
        } else {
          setState("empty");
        }
      })
      .catch(() => {
        if (!cancelled) setState("empty");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 프로필 페이지의 <form> 밖(document.body)에 그린다 — 안에 그대로 두면 이
  // 팝업 안의 탭 버튼 같은 걸 눌렀을 때 그 클릭이 프로필 저장 폼까지 잠재적으로
  // 영향을 줄 수 있다. 이 컴포넌트는 항상 클릭으로만 열리므로(SSR 경로 없음)
  // document는 렌더 시점에 이미 있다
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/90 p-4 py-10 backdrop-blur-sm sm:py-16"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative mx-auto w-full max-w-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("resultClose")}
          className="absolute -top-3 right-0 z-10 rounded-full bg-slate-800 p-2 text-slate-300 shadow-lg transition hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="pt-10">
          {state === "loading" && (
            <div className="h-64 animate-pulse rounded-3xl border border-white/10 bg-slate-900/50" />
          )}

          {state === "empty" && (
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-10 text-center">
              <p className="text-sm text-slate-300">{t("noSavedResult")}</p>
              <Link
                href="/personality"
                onClick={onClose}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-400"
              >
                {t("goTest")}
                <ArrowRight size={15} />
              </Link>
            </div>
          )}

          {state === "ready" && data && (
            <PersonalityResultView
              primary={data.primary}
              secondary={data.secondary}
              scores={data.scores}
              expanded
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
