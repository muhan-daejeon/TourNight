"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Soup,
  Sparkles,
  CarTaxiFront,
  Beer,
  type LucideIcon,
} from "lucide-react";

const TOPIC_IDS = ["pojangmacha", "festival", "transport", "dining"] as const;

const TOPIC_ICONS: Record<string, LucideIcon> = {
  pojangmacha: Soup,
  festival: Sparkles,
  transport: CarTaxiFront,
  dining: Beer,
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
        {TOPIC_IDS.map((id) => {
          const Icon = TOPIC_ICONS[id];
          return (
            <button
              key={id}
              onClick={() => loadTopic(id)}
              className={`rounded-2xl border p-4 text-center text-sm backdrop-blur transition ${
                selected === id
                  ? "border-amber-400/60 bg-amber-400/10 text-white shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                  : "border-white/10 bg-white/5 text-slate-300 hover:-translate-y-0.5 hover:border-white/25 hover:text-white"
              }`}
            >
              <Icon
                size={22}
                strokeWidth={1.8}
                className={`mx-auto mb-2 ${selected === id ? "text-amber-300" : "text-slate-400"}`}
              />
              {t(`topics.${id}`)}
            </button>
          );
        })}
      </div>

      <div className="mt-6 min-h-32 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
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
