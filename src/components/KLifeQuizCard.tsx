"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { KLocale, KQuiz } from "@/lib/klife-restaurant";

/** 상황 퀴즈 한 문항 — 고르면 바로 정오 표시와 해설.
 *  식당편 위저드(KLifeGuide)와 상황별 전체 화면(KLifeScenario)이 같이 쓴다 */
export default function KLifeQuizCard({ q, locale }: { q: KQuiz; locale: KLocale }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold leading-relaxed text-slate-900">{q.prompt[locale]}</p>
      <div className="mt-3 space-y-2">
        {q.options.map((o, i) => {
          const isPicked = picked === i;
          const revealed = picked !== null;
          return (
            <button
              key={i}
              type="button"
              disabled={revealed}
              onClick={() => setPicked(i)}
              className={`flex w-full items-center gap-2.5 rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                revealed && o.correct
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                  : isPicked
                    ? "border-rose-400 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-slate-50 text-slate-400 enabled:hover:border-indigo-300"
              }`}
            >
              {revealed && o.correct ? (
                <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
              ) : isPicked ? (
                <XCircle size={15} className="shrink-0 text-rose-400" />
              ) : (
                <span className="h-[15px] w-[15px] shrink-0 rounded-full border border-slate-300" />
              )}
              {o.text[locale]}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className="mt-3 rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs leading-relaxed text-slate-400">
          💡 {q.feedback[locale]}
        </p>
      )}
    </div>
  );
}
