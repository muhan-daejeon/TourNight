"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MoonStar, Sparkles } from "lucide-react";

interface Guide {
  intro: string;
  tips: string[];
}

export default function SpotGuide({ contentId }: { contentId: string }) {
  const t = useTranslations("spot");
  const locale = useLocale();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/spot-guide?contentId=${contentId}&locale=${locale}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setGuide(data);
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [contentId, locale]);

  if (status === "error") return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <MoonStar size={17} className="text-amber-300" />
        {t("guideTitle")}
      </h2>
      {status === "loading" ? (
        <div className="mt-4">
          <p className="flex items-center gap-2 text-sm text-amber-300/90">
            <Sparkles size={14} className="animate-pulse" />
            {t("generating")}
          </p>
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-white/5"
                style={{ width: `${90 - i * 15}%` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* 소개문은 길어서 3줄만 보여주고 나머지는 펼쳐 읽게 한다 */}
          <p
            className={`mt-3 leading-relaxed text-slate-300 ${expanded ? "" : "line-clamp-3"}`}
          >
            {guide?.intro}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 text-xs font-semibold text-amber-300/80 transition hover:text-amber-300"
          >
            {expanded ? t("less") : t("more")}
          </button>
          <ul className="mt-4 space-y-2">
            {guide?.tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="mt-0.5 shrink-0 text-amber-300">✦</span>
                {tip}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
