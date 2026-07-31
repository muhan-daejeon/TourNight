"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

const TOPIC_IDS = ["pojangmacha", "festival", "transport", "dining"] as const;

const TOPIC_ICONS: Record<string, string> = {
  pojangmacha: "🍢",
  festival: "🎆",
  transport: "🚕",
  dining: "🍻",
};

export default function EtiquetteTopics() {
  const t = useTranslations("etiquette");
  const locale = useLocale();
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [text, setText] = useState("");

  async function loadTopic(topicId: string) {
    setSelected(topicId);
    setStatus("loading");
    setText("");
    try {
      const res = await fetch(
        `/api/etiquette?topic=${topicId}&locale=${locale}`,
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setText(data.text);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mt-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TOPIC_IDS.map((id) => (
          <button
            key={id}
            onClick={() => loadTopic(id)}
            className={`rounded-xl border p-4 text-center text-sm transition ${
              selected === id
                ? "border-amber-400 bg-slate-800 text-white"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600"
            }`}
          >
            <div className="mb-2 text-2xl">{TOPIC_ICONS[id]}</div>
            {t(`topics.${id}`)}
          </button>
        ))}
      </div>

      <div className="mt-6 min-h-32 rounded-xl border border-slate-800 bg-slate-900 p-6">
        {status === "loading" && (
          <p className="animate-pulse text-slate-400">{t("loading")}</p>
        )}
        {status === "error" && <p className="text-red-400">{t("error")}</p>}
        {status === "idle" && text && (
          <p className="whitespace-pre-wrap leading-relaxed text-slate-200">
            {text}
          </p>
        )}
      </div>
    </div>
  );
}
