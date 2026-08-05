"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import {
  Soup,
  Beer,
  MicVocal,
  Sparkles,
  Waves,
  Trees,
  UtensilsCrossed,
  Store,
  CarTaxiFront,
  ShieldAlert,
  Check,
  X,
  MessageCircle,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

// 그룹 구성: 예절 6 + 실용 정보 4 (서버 ETIQUETTE_TOPICS와 일치)
const GROUPS: { key: "manners" | "practical"; topics: string[] }[] = [
  {
    key: "manners",
    topics: ["pojangmacha", "dining", "noraebang", "festival", "oncheon", "nature"],
  },
  { key: "practical", topics: ["latefood", "convenience", "transport", "safety"] },
];

const TOPIC_ICONS: Record<string, LucideIcon> = {
  pojangmacha: Soup,
  dining: Beer,
  noraebang: MicVocal,
  festival: Sparkles,
  oncheon: Waves,
  nature: Trees,
  latefood: UtensilsCrossed,
  convenience: Store,
  transport: CarTaxiFront,
  safety: ShieldAlert,
};

interface Phrase {
  korean: string;
  roman: string;
  meaning: string;
}

interface Guide {
  intro: string;
  dos: string[];
  donts: string[];
  phrases: Phrase[];
  spots: {
    contentId: string;
    title: string;
    imageUrl: string | null;
    category: string;
  }[];
}

export default function NightEtiquette() {
  const t = useTranslations("etiquette");
  const locale = useLocale();
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [guide, setGuide] = useState<Guide | null>(null);

  async function loadTopic(topicId: string) {
    setSelected(topicId);
    setStatus("loading");
    setGuide(null);
    try {
      const res = await fetch(`/api/etiquette?topic=${topicId}&locale=${locale}`);
      if (!res.ok) throw new Error();
      setGuide(await res.json());
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
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-3">
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

      {status === "loading" && (
        <p className="mt-6 flex items-center gap-2 text-sm text-amber-300/90">
          <Sparkles size={14} className="animate-pulse" />
          {t("generating")}
        </p>
      )}
      {status === "error" && <p className="mt-6 text-red-400">{t("error")}</p>}

      {status === "idle" && guide && (
        <div className="mt-6 space-y-4">
          <p className="leading-relaxed text-slate-300">{guide.intro}</p>

          {/* Do / Don't */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5">
              <p className="mb-3 text-sm font-bold text-emerald-300">{t("dos")}</p>
              <ul className="space-y-2.5">
                {guide.dos.map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-200">
                    <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.05] p-5">
              <p className="mb-3 text-sm font-bold text-rose-300">{t("donts")}</p>
              <ul className="space-y-2.5">
                {guide.donts.map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-200">
                    <X size={15} className="mt-0.5 shrink-0 text-rose-400" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 상황 표현 */}
          {guide.phrases.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-amber-300">
                <MessageCircle size={14} />
                {t("saySection")}
              </p>
              <ul className="space-y-3">
                {guide.phrases.map((p, i) => (
                  <li key={i} className="flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-100">{p.korean}</span>
                    <span className="text-xs text-amber-300/80">{p.roman}</span>
                    <span className="text-sm text-slate-400">{p.meaning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 관련 야간 명소 */}
          {guide.spots.length > 0 && (
            <div>
              <p className="mb-2.5 text-sm font-bold text-slate-300">
                {t("relatedSpots")}
              </p>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {guide.spots.map((s) => (
                  <Link
                    key={s.contentId}
                    href={`/spots/${s.contentId}`}
                    className="glass-card group overflow-hidden rounded-xl"
                  >
                    <div className="relative h-20 bg-slate-800">
                      {s.imageUrl && (
                        <Image
                          src={s.imageUrl}
                          alt={s.title}
                          fill
                          sizes="200px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1 p-2.5">
                      <span className="truncate text-[13px] font-semibold text-slate-100 group-hover:text-amber-300">
                        {s.title}
                      </span>
                      <ChevronRight size={13} className="ml-auto shrink-0 text-slate-600" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
