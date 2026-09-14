"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  ChevronRight,
  ChevronLeft,
  Languages,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { ETIQUETTE_ITEMS, type EtiquetteItem } from "@/lib/etiquette-items";
import KLifeGuide from "./KLifeGuide";
import { RESTAURANT_STEPS, RESTAURANT_QUIZ } from "@/lib/klife-restaurant";

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

/**
 * 에티켓 주제 → 서바이벌 표현 카테고리(/api/phrases의 book 키) 매핑.
 *
 * "이 상황에서 어떻게 행동해야 하나(에티켓)" 바로 아래에 "그 상황에서 뭐라고
 * 말하나(표현)"를 붙인다 — 따로 보던 두 기능을 한 학습 흐름으로 잇는 통합.
 * 자연스러운 짝이 없는 주제(공원·야경 등)는 표현 섹션을 생략한다.
 */
const TOPIC_PHRASE_CATEGORY: Record<string, string> = {
  pojangmacha: "bar",
  dining: "food",
  latefood: "food",
  streets: "food",
  noraebang: "bar",
  convenience: "store",
  transport: "taxi",
  safety: "help",
};

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

export default function NightEtiquette({
  topicImages = {},
}: {
  /** 주제별 대표 사진 (서버에서 조회) — 없는 주제는 아이콘 카드로 표시 */
  topicImages?: Record<string, string>;
}) {
  const t = useTranslations("etiquette");
  const tk = useTranslations("klife");
  const locale = useLocale();
  const [selected, setSelected] = useState<string | null>(null);
  const images = selected ? ETIQUETTE_ITEMS[selected] : undefined;

  // 상황별 실전 표현 — 표현집(/api/phrases)의 카테고리를 그대로 재사용한다.
  // 표현집과 같은 이유로 ko는 en으로 폴백(한국어 화자는 뜻풀이가 필요 없지만
  // 로마자 표기·영문 뜻이 함께 있는 편이 동행 외국인에게 보여주기 좋다).
  const effectiveLocale = locale === "ko" ? "en" : locale;
  const [phraseBook, setPhraseBook] = useState<Record<
    string,
    { korean: string; roman: string; meaning: string }[]
  > | null>(null);
  useEffect(() => {
    // 주제를 처음 골랐을 때 한 번만 받아 둔다 (book 전체가 와서 이후엔 즉시)
    if (!selected || phraseBook !== null) return;
    let cancelled = false;
    fetch(`/api/phrases?locale=${effectiveLocale}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setPhraseBook(data.book ?? {});
      })
      .catch(() => {
        if (!cancelled) setPhraseBook({});
      });
    return () => {
      cancelled = true;
    };
  }, [selected, phraseBook, effectiveLocale]);

  // 주제를 골라 상세를 보면 잠시 뒤 "이제 한국 생활을 배워볼까요?" 팝업이
  // 화면을 블러로 덮으며 떠서 K-Life 가이드로 잇는다 (피드백 플로우 2→3단계)
  const [learnPrompt, setLearnPrompt] = useState(false);
  // 팝업의 "시작하기"를 누르면 페이지를 떠나지 않고 이 자리에서 K-Life
  // 가이드(식당편)가 이어진다 — 두 페이지를 하나의 학습 흐름으로 합쳤다
  const [klifeStarted, setKlifeStarted] = useState(false);
  useEffect(() => {
    if (!selected || klifeStarted) return; // 닫힘 리셋은 각 클릭 핸들러에서 (효과 내 동기 setState 회피)
    const id = window.setTimeout(() => setLearnPrompt(true), 2000);
    return () => window.clearTimeout(id);
  }, [selected, klifeStarted]);

  const phraseCategory = selected ? TOPIC_PHRASE_CATEGORY[selected] : undefined;
  const phrases = phraseCategory ? phraseBook?.[phraseCategory]?.slice(0, 6) : undefined;

  // 듣기 — K-Life 가이드와 같은 브라우저 TTS(ko-KR). 행동(에티켓) 옆에서 말
  // (표현)을 바로 소리로 익히게 한다 — "한 페이지에 나눠놓은" 게 아니라
  // 같은 상황 카드 안에서 학습이 이어지도록.
  const [speakingKo, setSpeakingKo] = useState<string | null>(null);
  const speak = useCallback((textKo: string) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(textKo);
      u.lang = "ko-KR";
      u.rate = 0.85;
      u.onend = () => setSpeakingKo(null);
      u.onerror = () => setSpeakingKo(null);
      setSpeakingKo(textKo);
      synth.speak(u);
    } catch {
      setSpeakingKo(null);
    }
  }, []);
  // 사진은 언어와 무관(공용 매니페스트), 설명 문구만 로케일별 번역을 index로 맞춰 쓴다
  const captions = selected
    ? (t.raw(`items.${selected}`) as { dos: string[]; donts: string[] })
    : undefined;

  // 주제를 고르면 이렇게 하세요/피하세요 칸이 아래에 새로 생기는데, 위에서는
  // 안 보여서 매번 스크롤을 따로 내려야 했다. 고른 순간 그 칸이 화면 중앙
  // 높이쯤 오도록 자동으로 내려준다
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selected) return;
    const el = resultRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const target = window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2;
    window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [selected]);

  return (
    <div className="mt-8" data-tour="etiquette">
      {/* 주제를 고르면 박스들은 접어두고 상세가 화면을 채운다 (피드백 플로우 1단계) */}
      {selected && (
        <button
          type="button"
          onClick={() => {
            // K-Life 중이면 한 단계만 물러나 에티켓 상세로, 아니면 주제 목록으로
            if (klifeStarted) setKlifeStarted(false);
            else setSelected(null);
            setLearnPrompt(false);
          }}
          className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-daejeon-blue hover:text-daejeon-blue"
        >
          <ChevronLeft size={15} />
          {klifeStarted ? t("backToEtiquette") : t("backToTopics")}
        </button>
      )}
      {!selected && GROUPS.map((group) => (
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
                  onClick={() => { setSelected(id); setLearnPrompt(false); setKlifeStarted(false); }}
                  className={`group relative h-28 overflow-hidden rounded-2xl border text-left transition sm:h-32 ${
                    selected === id
                      ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                      : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300"
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
                      <Icon size={30} strokeWidth={1.3} className="text-slate-300" />
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
                      className={`shrink-0 ${selected === id ? "text-amber-600" : "text-amber-600/70"}`}
                    />
                    <span
                      className={
                        selected === id
                          ? "text-amber-700"
                          : "text-slate-900 group-hover:text-amber-700"
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

      {!klifeStarted && images && captions && (
        <div ref={resultRef} className="mt-6">
          {/* Do / Don't — 항목마다 사진 한 장 + 설명, 화살표로 한 장씩 넘겨 본다 */}
          <div className="grid gap-3 sm:grid-cols-2">
            <DoDontSlider
              key={`dos-${selected}`}
              title={t("dos")}
              images={images.dos}
              captions={captions.dos}
              tone="emerald"
              Icon={Check}
            />
            <DoDontSlider
              key={`donts-${selected}`}
              title={t("donts")}
              images={images.donts}
              captions={captions.donts}
              tone="rose"
              Icon={X}
            />
          </div>

          {/* 이 상황에서 바로 쓰는 한국어 — 에티켓(행동)과 표현(말)을 한 흐름으로 */}
          {phraseCategory && phrases && phrases.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-600">
                <Languages size={15} />
                {t("situationPhrases")}
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {phrases.map((p) => (
                  <li
                    key={p.korean}
                    className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-semibold text-slate-900">{p.korean}</span>
                      <span className="text-xs text-amber-600/80">{p.roman}</span>
                      <span className="text-sm text-slate-400">{p.meaning}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => speak(p.korean)}
                      aria-label={p.korean}
                      className="shrink-0 rounded-full bg-slate-100 p-2.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-900"
                    >
                      <Volume2
                        size={15}
                        className={speakingKo === p.korean ? "animate-pulse text-amber-600" : ""}
                      />
                    </button>
                  </li>
                ))}
              </ul>
              <a
                href="#phrasebook"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 transition hover:text-amber-600"
              >
                {t("phrasesMore")}
                <ChevronRight size={13} />
              </a>
            </div>
          )}
        </div>
      )}

      {/* K-Life 가이드 — 팝업의 "시작하기" 다음 단계. 별도 페이지로 보내지 않고
          이 자리에서 식당편 시나리오가 이어진다 (피드백 플로우 3단계) */}
      {klifeStarted && (
        <div className="mt-6">
          <div className="mb-6">
            <p className="overline-label">K-LIFE GUIDE</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
              {tk("restaurantTitle")}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">{tk("restaurantSubtitle")}</p>
          </div>
          <KLifeGuide
            scenario="restaurant"
            steps={RESTAURANT_STEPS}
            quiz={RESTAURANT_QUIZ}
          />
        </div>
      )}

      {/* 학습 유도 — 화면 전체를 블러로 덮고, 팝업만 또렷하게 (피드백 플로우 2단계) */}
      {learnPrompt && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-white/40 p-6 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_24px_64px_rgba(15,23,42,0.25)]">
            <button
              type="button"
              onClick={() => setLearnPrompt(false)}
              aria-label={t("learnLater")}
              className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition hover:text-slate-700"
            >
              <X size={16} />
            </button>
            <p className="text-xl font-extrabold text-slate-900">{t("learnTitle")}</p>
            <button
              type="button"
              onClick={() => {
                setLearnPrompt(false);
                setKlifeStarted(true);
                // 팝업이 닫히고 가이드가 그려진 다음 프레임에 맨 위로
                window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-daejeon-blue px-8 py-3 text-sm font-bold text-white transition hover:bg-indigo-500"
            >
              {t("learnCta")}
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const TONE = {
  emerald: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-600", icon: "text-emerald-400" },
  rose: { border: "border-rose-200", bg: "bg-rose-50", text: "text-rose-600", icon: "text-rose-400" },
} as const;

/**
 * 항목 하나(사진 + 설명)씩 화살표로 넘겨 보는 Do/Don't 카드.
 * 사진(images)은 로케일과 무관한 공용 자산이고, 설명(captions)만 번역별로
 * 갈라져 있어 같은 index끼리 짝지어 쓴다 — 둘의 길이가 항상 같다고 가정한다
 * (messages/*.json의 etiquette.items가 이 매니페스트와 같은 순서로 채워져 있어야 함).
 */
function DoDontSlider({
  title,
  images,
  captions,
  tone,
  Icon,
}: {
  title: string;
  images: EtiquetteItem[];
  captions: string[];
  tone: keyof typeof TONE;
  Icon: LucideIcon;
}) {
  const t = useTranslations("etiquette");
  const [index, setIndex] = useState(0);
  const c = TONE[tone];

  if (images.length === 0) return null;
  const current = Math.min(index, images.length - 1);

  return (
    <div className={`rounded-2xl border p-5 ${c.border} ${c.bg}`}>
      <p className={`mb-3 text-sm font-bold ${c.text}`}>{title}</p>

      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-100">
        <Image
          src={images[current].image}
          alt=""
          fill
          sizes="(min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>

      <p className="mt-3 flex gap-2 text-sm text-slate-400">
        <Icon size={15} className={`mt-0.5 shrink-0 ${c.icon}`} />
        {captions[current] ?? images[current].caption}
      </p>

      {images.length > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
            aria-label={t("prevItem")}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs tabular-nums text-slate-500">
            {current + 1} / {images.length}
          </span>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % images.length)}
            aria-label={t("nextItem")}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
