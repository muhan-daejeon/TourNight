"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";

interface Phrase {
  korean: string;
  roman: string;
  meaning: string;
}

/** 밤 상황 서바이벌 한국어 — 한국어 사용자에게는 표시하지 않음 */
export default function SurvivalPhrases() {
  const t = useTranslations("etiquette");
  const locale = useLocale();
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");

  useEffect(() => {
    if (locale === "ko") return;
    let cancelled = false;
    fetch(`/api/phrases?locale=${locale}`)
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
  }, [locale]);

  if (locale === "ko" || status === "error") return null;

  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <MessageCircle size={17} className="text-amber-300" />
        {t("phrasesTitle")}
      </h2>
      <p className="mt-1 text-sm text-slate-400">{t("phrasesSubtitle")}</p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
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
