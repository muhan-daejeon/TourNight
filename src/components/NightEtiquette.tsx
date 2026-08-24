"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import {
  Footprints,
  TreeDeciduous,
  Eye,
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
const GROUPS: { key: "places" | "culture"; topics: string[] }[] = [
  {
    key: "places",
    topics: ["streets", "parks", "views", "nature", "oncheon"],
  },
  {
    key: "culture",
    topics: [
      "pojangmacha", "dining", "noraebang", "festival",
      "latefood", "convenience", "transport", "safety",
    ],
  },
];

const TOPIC_ICONS: Record<string, LucideIcon> = {
  streets: Footprints,
  parks: TreeDeciduous,
  views: Eye,
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
  phrasesAdvanced?: Phrase[];
  spots: {
    contentId: string;
    title: string;
    imageUrl: string | null;
    category: string;
  }[];
}

export default function NightEtiquette({
  topicImages = {},
}: {
  /** 주제별 대표 사진 (서버에서 조회) — 없는 주제는 아이콘 카드로 표시 */
  topicImages?: Record<string, string>;
}) {
  const t = useTranslations("etiquette");
  const locale = useLocale();
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [guide, setGuide] = useState<Guide | null>(null);
  const [level, setLevel] = useState<"basic" | "advanced">("basic");

  async function loadTopic(topicId: string) {
    setSelected(topicId);
    setStatus("loading");
    setGuide(null);
    setLevel("basic");
    try {
      const res = await fetch(`/api/etiquette?topic=${topicId}&locale=${locale}`);
      if (!res.ok) throw new Error();
      setGuide(await res.json());
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const hasAdvanced = (guide?.phrasesAdvanced?.length ?? 0) > 0;
  const phrases =
    level === "advanced" && hasAdvanced
      ? guide!.phrasesAdvanced!
      : (guide?.phrases ?? []);

  return (
    <div className="mt-8" data-tour="etiquette">
      {GROUPS.map((group) => (
        <div key={group.key} className="mb-5">
          <p className="overline-label mb-2">{t(`groups.${group.key}`)}</p>
          {/* 사진이 먼저 보이고 그 아래 주제명을 얹은 카드 */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {group.topics.map((id) => {
              const Icon = TOPIC_ICONS[id];
              const image = topicImages[id];
              return (
                <button
                  key={id}
                  onClick={() => loadTopic(id)}
                  className={`group relative h-28 overflow-hidden rounded-2xl border text-left transition sm:h-32 ${
                    selected === id
                      ? "border-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                      : "border-white/10 hover:-translate-y-0.5 hover:border-white/25"
                  }`}
                >
                  {image ? (
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 33vw, 50vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
                      <Icon size={30} strokeWidth={1.3} className="text-white/20" />
                    </span>
                  )}
                  <span
                    className={`absolute inset-0 transition ${
                      selected === id
                        ? "bg-gradient-to-t from-amber-950/90 via-slate-950/50 to-slate-950/20"
                        : "bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/10"
                    }`}
                  />
                  <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 p-2.5 text-[13px] font-bold leading-tight sm:text-sm">
                    <Icon
                      size={14}
                      strokeWidth={2.2}
                      className={`shrink-0 ${selected === id ? "text-amber-300" : "text-amber-300/70"}`}
                    />
                    <span
                      className={
                        selected === id
                          ? "text-amber-200"
                          : "text-white group-hover:text-amber-200"
                      }
                    >
                      {t(`topics.${id}`)}
                    </span>
                  </span>
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
          <p className="text-sm leading-relaxed text-slate-400">{guide.intro}</p>

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

          {/* 상황 표현 — 기본(외워 쓰는 짧은 말) / 심화(요청·양해를 구하는 말) */}
          {phrases.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <p className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                  <MessageCircle size={14} />
                  {t("saySection")}
                </p>
                {hasAdvanced && (
                  <div className="ml-auto flex gap-1 rounded-full border border-white/10 bg-white/5 p-0.5">
                    {(["basic", "advanced"] as const).map((lv) => (
                      <button
                        key={lv}
                        type="button"
                        onClick={() => setLevel(lv)}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                          level === lv
                            ? "bg-amber-400 text-slate-950"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {t(`level.${lv}`)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <ul className="space-y-3">
                {phrases.map((p, i) => (
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
                    <div className="relative h-32 bg-slate-800">
                      {s.imageUrl && (
                        <Image
                          src={s.imageUrl}
                          alt={s.title}
                          fill
                          sizes="(min-width: 640px) 33vw, 100vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
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
