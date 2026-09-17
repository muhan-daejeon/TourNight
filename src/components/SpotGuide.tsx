"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MoonStar } from "lucide-react";

interface Guide {
  intro: string;
}

/**
 * 투어나잇 야간 가이드 — 한국관광공사 공식 소개문을 그대로 보여준다.
 * AI가 글을 새로 짓지 않는다 — "불러오는 중" 뿐, 없으면(그 언어로 된
 * 소개문이 없는 곳) 섹션 자체를 그리지 않는다.
 */
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
    <section className="rounded-2xl border border-slate-200 bg-slate-100 p-6 backdrop-blur">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <MoonStar size={17} className="text-amber-600" />
        {t("guideTitle")}
      </h2>
      {status === "loading" ? (
        <div className="mt-4">
          <p className="text-sm text-slate-400">{t("generating")}</p>
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-slate-100"
                style={{ width: `${90 - i * 15}%` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* 소개문은 길어서 3줄만 보여주고 나머지는 펼쳐 읽게 한다 */}
          <p
            className={`mt-3 leading-relaxed text-slate-400 ${expanded ? "" : "line-clamp-3"}`}
          >
            {guide?.intro}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 text-xs font-semibold text-amber-600/80 transition hover:text-amber-600"
          >
            {expanded ? t("less") : t("more")}
          </button>
        </>
      )}
    </section>
  );
}
