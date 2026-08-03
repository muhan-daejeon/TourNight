"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

interface Phrase {
  korean: string;
  roman: string;
  meaning: string;
}

/** 밤 상황 서바이벌 한국어 — 한국어 사용자에게는 영어판 미리보기로 표시 */
export default function SurvivalPhrases() {
  const locale = useLocale();
  const effectiveLocale = locale === "ko" ? "en" : locale;
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/phrases?locale=${effectiveLocale}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setPhrases(data.phrases ?? []);
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveLocale]);

  if (status === "error") return null;

  return (
    <section className="mt-8">
      <div className="overflow-hidden rounded-2xl border border-white/10">
        {status === "loading" ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-white/5" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {phrases.map((p, i) => (
              <li key={i} className="flex flex-col gap-0.5 bg-white/[0.02] px-5 py-3">
                <span className="font-semibold text-slate-100">{p.korean}</span>
                <span className="text-xs text-amber-300/80">{p.roman}</span>
                <span className="text-sm text-slate-400">{p.meaning}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
