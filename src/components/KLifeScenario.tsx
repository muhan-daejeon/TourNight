"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { ETIQUETTE_ITEMS } from "@/lib/etiquette-items";
import type { KLocale } from "@/lib/klife-restaurant";
import type { KScenario, KSituation } from "@/lib/klife-scenarios";
import DoDontSlider from "./DoDontSlider";
import KLifeQuizCard from "./KLifeQuizCard";

/** 화면 0 인트로(Do/Don't) · 1~3 STEP · 4 퀴즈 */
const SCREENS = 5;
const QUIZ = SCREENS - 1;
/** 시작하기 뒤의 진행 표기는 인트로를 빼고 센다 — 01/04 · 02/04 · 03/04 · Quiz */
const STAGES = SCREENS - 1;

/**
 * 상황 박스를 누르면 뜨는 전체 화면 가이드.
 *
 * 스크롤로 내려 읽는 대신 한 화면에 한 장면씩 — 이전/다음(또는 ←/→ 키)으로
 * 넘기고 Esc나 상단 닫기로 나간다. 첫 화면은 에티켓의 이렇게 하세요/피하세요를
 * 그대로 가져오고, 그 밑의 "이제 한국 생활을 배워볼까요? · 시작하기"가 STEP 1로
 * 잇는다. 첫 화면엔 하단 내비가 없고 시작하기를 누른 뒤에야 생긴다.
 * 헤더(z-56)·마스코트(z-60)보다 위에 깔고, 열려 있는 동안 뒤 문서는 스크롤을
 * 잠근다. 내용이 화면보다 길어지는 작은 창에서만 안쪽이 스크롤된다.
 */
export default function KLifeScenario({
  situation,
  scenario,
  onClose,
}: {
  situation: KSituation;
  scenario: KScenario;
  onClose: () => void;
}) {
  const t = useTranslations("etiquette");
  const tk = useTranslations("klife");
  const locale = useLocale() as KLocale;
  const [screen, setScreen] = useState(0);
  const go = (n: number) => setScreen(Math.min(Math.max(n, 0), SCREENS - 1));

  // 뒤 문서 스크롤 잠금 + 키보드 (Esc 닫기, ←/→ 이동)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setScreen((s) => Math.min(s + 1, SCREENS - 1));
      else if (e.key === "ArrowLeft") setScreen((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // 첫 화면 Do/Don't — 시나리오 전용(dodont)이 있으면 그걸, 없으면 주제 공용
  // 에티켓 사진·문구로. 교통은 버스·지하철·택시가 각자 다른 예절을 보여준다
  const topicImages = ETIQUETTE_ITEMS[situation.topic];
  const topicCaptions = t.raw(`items.${situation.topic}`) as { dos: string[]; donts: string[] };
  const dd = scenario.dodont;
  const dos = dd
    ? { images: [{ image: dd.do.image, caption: dd.do.text[locale] }], captions: [dd.do.text[locale]] }
    : { images: topicImages?.dos ?? [], captions: topicCaptions?.dos ?? [] };
  const donts = dd
    ? { images: [{ image: dd.dont.image, caption: dd.dont.text[locale] }], captions: [dd.dont.text[locale]] }
    : { images: topicImages?.donts ?? [], captions: topicCaptions?.donts ?? [] };
  // 교통처럼 한 상황에 시나리오가 여럿이면 "교통 · 지하철"로, 아니면 이름 하나만
  const multi = situation.scenarios.length > 1;
  const stepIndex = screen - 1; // 화면 1~3 → steps[0..2]
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={scenario.title[locale]}
      className="fixed inset-0 z-[70] flex h-dvh flex-col bg-white text-slate-900"
    >
      {/* ── 상단 바: 상황 이름 · 닫기(글자) ── */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-2.5 sm:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="overline-label shrink-0">K-Life</span>
          <span className="truncate text-sm font-bold">
            {multi ? `${situation.title[locale]} · ${scenario.title[locale]}` : scenario.title[locale]}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-xs font-semibold text-slate-400 transition hover:text-slate-900"
        >
          {tk("close")}
        </button>
      </div>

      {/* ── 장면 — 세로 가운데 정렬, 창이 작을 때만 안쪽 스크롤 ── */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 py-4 sm:px-8">
        <div className="w-full max-w-5xl">
          {screen === 0 && (
            <div key="intro">
              {/* 이렇게 하세요 / 피하세요 — 시나리오 사진·문구. 제목은 두지
                  않는다(상단 바에 이미 있고, 작은 창에서 잘려 보였다) */}
              <div className="grid gap-3 sm:grid-cols-2">
                <DoDontSlider
                  title={t("dos")}
                  images={dos.images}
                  captions={dos.captions}
                  tone="emerald"
                  Icon={Check}
                />
                <DoDontSlider
                  title={t("donts")}
                  images={donts.images}
                  captions={donts.captions}
                  tone="rose"
                  Icon={X}
                />
              </div>
              <div className="mt-3 flex flex-col items-center justify-between gap-3 rounded-2xl border border-amber-400 bg-white px-6 py-4 sm:flex-row">
                <p className="text-base font-extrabold">{t("learnTitle")}</p>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-daejeon-orange px-7 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                >
                  {t("learnCta")}
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {stepIndex >= 0 && stepIndex < scenario.steps.length && (
            <div key={`step-${stepIndex}`} className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-6xl font-extrabold leading-none text-amber-400 sm:text-7xl">
                    {pad(screen)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold tracking-wide text-slate-400">
                    STEP {screen}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-4xl">
                  {scenario.steps[stepIndex].title[locale]}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                  {scenario.steps[stepIndex].body[locale]}
                </p>
              </div>
              {/* 단계 사진 자리 — 아직 사진이 없는 단계는 빈 틀만 둔다 */}
              <div className="relative aspect-[4/3] max-h-[52vh] w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 justify-self-center">
                {scenario.steps[stepIndex].image ? (
                  <Image
                    src={scenario.steps[stepIndex].image!}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 480px, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-3 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 text-slate-300">
                    <ImageIcon size={36} strokeWidth={1.2} />
                    <span className="text-xs font-semibold">{t("photoSoon")}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {screen === QUIZ && (
            <div key="quiz">
              <div className="flex items-center gap-3">
                <span className="text-5xl font-extrabold leading-none text-amber-400 sm:text-6xl">
                  Quiz
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold tracking-wide text-slate-400">
                  <CheckCircle2 size={13} />
                  CHECK
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {tk("checkTitle")}
              </h2>
              <p className="mt-1.5 text-sm text-slate-400">{tk("checkSubtitle")}</p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {scenario.quiz.map((q, i) => (
                  <KLifeQuizCard key={i} q={q} locale={locale} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 하단 내비 — 시작하기를 누른 뒤에만. 이전 · 01/04 · 다음 (04/04에선 닫기) ── */}
      {screen > 0 && (
        <div className="flex items-center gap-2 border-t border-slate-200 px-5 py-2.5 sm:px-8">
          <button
            type="button"
            onClick={() => go(screen - 1)}
            aria-label={tk("prevStep")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-400 transition hover:text-slate-900"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">{tk("prevStep")}</span>
          </button>
          {/* 숫자만 — 01/04 … 04/04. 퀴즈도 04/04로 세고 "Quiz"는 본문 큰 글자에만 */}
          <span className="min-w-0 flex-1 truncate text-center text-xs font-semibold tabular-nums text-slate-400">
            {pad(screen)} / {pad(STAGES)}
          </span>
          {screen < QUIZ ? (
            <button
              type="button"
              onClick={() => go(screen + 1)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-300"
            >
              {tk("nextStep")}
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-300"
            >
              {tk("close")}
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
