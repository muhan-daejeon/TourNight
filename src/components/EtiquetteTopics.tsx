"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Soup,
  UtensilsCrossed,
  Store,
  Beer,
  MicVocal,
  Sparkles,
  CarTaxiFront,
  ShieldAlert,
  Waves,
  type LucideIcon,
} from "lucide-react";

const GROUPS: { key: string; topics: string[] }[] = [
  { key: "food", topics: ["pojangmacha", "latefood", "convenience"] },
  { key: "nightlife", topics: ["dining", "noraebang", "festival"] },
  { key: "practical", topics: ["transport", "safety", "oncheon"] },
];

const TOPIC_ICONS: Record<string, LucideIcon> = {
  pojangmacha: Soup,
  latefood: UtensilsCrossed,
  convenience: Store,
  dining: Beer,
  noraebang: MicVocal,
  festival: Sparkles,
  transport: CarTaxiFront,
  safety: ShieldAlert,
  oncheon: Waves,
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
      {GROUPS.map((group) => (
        <div key={group.key} className="mb-5">
          <p className="overline-label mb-2">{t(`groups.${group.key}`)}</p>
          <div className="grid grid-cols-3 gap-2.5">
            {group.topics.map((id) => {
              const Icon = TOPIC_ICONS[id];
              return (
                <button
                  key={id}
                  onClick={() => loadTopic(id)}
                  className={`rounded-2xl border p-3 text-center text-[13px] leading-tight backdrop-blur transition sm:p-4 sm:text-sm ${
                    selected === id
                      ? "border-amber-400/60 bg-amber-400/10 text-white shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                      : "border-white/10 bg-white/5 text-slate-300 hover:-translate-y-0.5 hover:border-white/25 hover:text-white"
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={1.8}
                    className={`mx-auto mb-1.5 ${selected === id ? "text-amber-300" : "text-slate-400"}`}
                  />
                  {t(`topics.${id}`)}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {(status !== "idle" || text) && (
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
      )}
    </div>
  );
}
