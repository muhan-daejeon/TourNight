"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  MessageCircle,
  Volume2,
  X,
  XCircle,
} from "lucide-react";
import type { KLocale, KPhrase, KQuiz, KStep } from "@/lib/klife-restaurant";

/**
 * K-Life 상황 가이드 공통 UI (개발정의서 4·7항).
 *
 * 시나리오 데이터(steps·quiz)만 갈아끼우면 술집/택시/쇼핑 등 다른 상황에도
 * 그대로 재사용한다. 원칙(정의서 2항): 실제 행동 순서대로, 설명은 짧게 핵심
 * 문장은 크게, 행동(팁)과 말(표현)을 한 카드 흐름 안에서.
 *
 * - Listen: 브라우저 TTS(ko-KR) — 오디오 파일 없이 원문 발음을 바로 들려준다
 * - Save: localStorage 북마크 → 하단 MY PHRASES에서 재확인 (여행 중 재사용)
 * - Quick Use 단계: 카드를 누르면 문장이 화면 가득 커진다 (직원에게 보여주기)
 * - 진행률: 스크롤과 상단 스텝퍼를 동기화, 이전/다음 버튼으로도 이동
 */
export default function KLifeGuide({
  scenario,
  steps,
  quiz,
}: {
  scenario: string;
  steps: KStep[];
  quiz: KQuiz[];
}) {
  const t = useTranslations("klife");
  const locale = useLocale() as KLocale;
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<KPhrase | null>(null);
  // 위저드 컨테이너 맨 위 — 단계가 바뀔 때 여기로 시선을 되돌린다
  const topRef = useRef<HTMLDivElement>(null);

  // ── 저장(북마크) — 기기 로컬에만 남는 가벼운 개인화.
  // SSR 첫 그림은 빈 목록(서버 스냅샷), 마운트 후 저장분을 구독한다 —
  // effect에서 setState 하는 방식 대신 스토어 구독으로 하이드레이션도 안전하다
  const storageKey = `klife-saved-${scenario}`;
  const savedRaw = useSyncExternalStore(
    useCallback((onChange: () => void) => {
      window.addEventListener("klife-saved", onChange);
      window.addEventListener("storage", onChange); // 다른 탭에서의 변경
      return () => {
        window.removeEventListener("klife-saved", onChange);
        window.removeEventListener("storage", onChange);
      };
    }, []),
    () => {
      try {
        return localStorage.getItem(storageKey) ?? "[]";
      } catch {
        return "[]";
      }
    },
    () => "[]",
  );
  const saved = useMemo<string[]>(() => {
    try {
      const v = JSON.parse(savedRaw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }, [savedRaw]);
  const toggleSave = (ko: string) => {
    const next = saved.includes(ko) ? saved.filter((k) => k !== ko) : [...saved, ko];
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event("klife-saved"));
  };
  const allPhrases = steps.flatMap((s) => s.phrases);
  const savedPhrases = allPhrases.filter((p) => saved.includes(p.ko));

  // ── 듣기 — SpeechSynthesis (ko-KR) ──
  const [speaking, setSpeaking] = useState<string | null>(null);
  const speak = useCallback((textKo: string) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(textKo);
      u.lang = "ko-KR";
      u.rate = 0.85; // 학습용이라 또박또박
      u.onend = () => setSpeaking(null);
      u.onerror = () => setSpeaking(null);
      setSpeaking(textKo);
      synth.speak(u);
    } catch {
      setSpeaking(null);
    }
  }, []);

  // ── 단계 전환 — 긴 스크롤 대신 같은 자리에서 내용만 바뀌는 위저드 방식.
  // 스크롤로 단계를 오르내리는 건 불편하다는 피드백. 전환 시 단계 헤더가
  // 화면 위로 오도록 되돌린다 (긴 단계 하단에서 다음을 눌렀을 때 대비)
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active]);

  const goTo = (idx: number) =>
    setActive(Math.min(Math.max(idx, 0), steps.length - 1));

  return (
    <div>
      {/* ── 스텝퍼 (진행률) — sticky로 늘 보인다 ── */}
      <div className="sticky top-[calc(var(--header-h,72px)+1px)] z-40 -mx-4 border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={s.title[locale]}
                aria-current={active === i ? "step" : undefined}
                className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold transition ${
                  active === i
                    ? "bg-amber-400 text-slate-950"
                    : i < active
                      ? "bg-amber-400/20 text-amber-300"
                      : "bg-white/5 text-slate-500 hover:text-slate-300"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-400">
            {String(active + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* ── 현재 단계 (위저드) — 다음/이전을 누르면 이 자리에서 내용만 바뀐다 ── */}
      <div ref={topRef} className="scroll-mt-32" />
      {(() => {
        const i = active;
        const step = steps[i];
        return (
        <section key={step.id} className="border-b border-white/[0.06] py-10">
          {/* STEP HEADER */}
          <p className="overline-label">
            {String(i + 1).padStart(2, "0")} · {step.code}
          </p>
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
            {step.title[locale]}
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">{step.subtitle[locale]}</p>

          {/* IN KOREA / CULTURE TIP */}
          <div className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-400/[0.05] p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-300">
              {t("inKorea")}
            </p>
            <ul className="mt-2.5 space-y-2">
              {step.tips.map((tip, j) => (
                <li key={j} className="flex gap-2 text-sm leading-relaxed text-slate-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                  {tip[locale]}
                </li>
              ))}
            </ul>
          </div>

          {/* 직원 말풍선 — 듣고 대비하는 상대방의 말 */}
          {step.staffLine && (
            <button
              type="button"
              onClick={() => speak(step.staffLine!.ko)}
              className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-left transition hover:border-amber-300/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300">
                <MessageCircle size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-slate-500">
                  {t("staffSays")}
                </span>
                <span className="mt-0.5 block text-base font-bold text-white">
                  &ldquo;{step.staffLine.ko}&rdquo;
                  <span className="ml-2 text-xs font-medium text-amber-300/80">
                    {step.staffLine.roman}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-slate-400">
                  {step.staffLine.meaning[locale]}
                </span>
              </span>
              <Volume2
                size={17}
                className={`shrink-0 ${speaking === step.staffLine.ko ? "animate-pulse text-amber-300" : "text-slate-500"}`}
              />
            </button>
          )}

          {/* REAL KOREAN */}
          <p className="mt-6 text-xs font-bold uppercase tracking-wide text-amber-300">
            {t("realKorean")}
          </p>
          {step.quickUse ? (
            /* Quick Use — 큰 버튼 그리드, 누르면 전체 화면 확대 */
            <div className="mt-3 grid grid-cols-2 gap-3">
              {step.phrases.map((p) => (
                <button
                  key={p.ko}
                  type="button"
                  onClick={() => setZoom(p)}
                  className="group rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-left transition hover:border-amber-300/50"
                >
                  <span className="flex items-center justify-between text-xs font-bold text-amber-300">
                    {p.situation[locale]}
                    <Maximize2 size={13} className="text-slate-500 group-hover:text-amber-300" />
                  </span>
                  <span className="mt-2 block text-lg font-bold leading-snug text-white">
                    {p.ko}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">{p.roman}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {step.phrases.map((p) => (
                <PhraseCard
                  key={p.ko}
                  p={p}
                  locale={locale}
                  main={!!p.main}
                  speaking={speaking === p.ko}
                  onSpeak={() => speak(p.ko)}
                  savedNow={saved.includes(p.ko)}
                  onSave={() => toggleSave(p.ko)}
                  saveLabel={t("save")}
                  listenLabel={t("listen")}
                />
              ))}
            </div>
          )}

          {/* 이전 / 다음 */}
          <div className="mt-7 flex items-center justify-between">
            {i > 0 ? (
              <button
                type="button"
                onClick={() => goTo(i - 1)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:text-white"
              >
                <ChevronUp size={14} />
                {t("prevStep")}
              </button>
            ) : (
              <span />
            )}
            {i < steps.length - 1 && (
              <button
                type="button"
                onClick={() => goTo(i + 1)}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-300"
              >
                {t("nextStep")}
                <ChevronDown size={14} />
              </button>
            )}
          </div>
        </section>
        );
      })()}

      {/* ── K-LIFE CHECK ── */}
      <section className="border-b border-white/[0.06] py-10">
        <p className="overline-label">K-LIFE CHECK</p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
          {t("checkTitle")}
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">{t("checkSubtitle")}</p>
        <div className="mt-5 space-y-4">
          {quiz.map((q, i) => (
            <QuizCard key={i} q={q} locale={locale} />
          ))}
        </div>
      </section>

      {/* ── MY PHRASES ── */}
      <section className="py-10">
        <p className="overline-label">MY PHRASES</p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
          {t("myPhrases")}
        </h2>
        {savedPhrases.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
            {t("myPhrasesEmpty")}
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {savedPhrases.map((p) => (
              <button
                key={p.ko}
                type="button"
                onClick={() => setZoom(p)}
                className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-4 text-left transition hover:border-amber-300/60"
              >
                <span className="block text-base font-bold text-white">{p.ko}</span>
                <span className="mt-0.5 block text-xs text-amber-300/80">{p.roman}</span>
                <span className="mt-1 block text-xs text-slate-400">
                  {p.meaning[locale]}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Quick Use 확대 오버레이 — 직원에게 그대로 보여주는 화면 ── */}
      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 bg-slate-950/97 p-6 backdrop-blur"
        >
          <p className="text-sm font-semibold text-slate-400">{zoom.situation[locale]}</p>
          <p className="max-w-3xl text-center text-4xl font-extrabold leading-tight text-white sm:text-6xl">
            {zoom.ko}
          </p>
          <p className="text-lg text-amber-300">{zoom.roman}</p>
          <p className="text-base text-slate-400">{zoom.meaning[locale]}</p>
          <div className="mt-2 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => speak(zoom.ko)}
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
            >
              <Volume2 size={16} className={speaking === zoom.ko ? "animate-pulse" : ""} />
              {t("listen")}
            </button>
            <button
              type="button"
              onClick={() => toggleSave(zoom.ko)}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:text-white"
            >
              {saved.includes(zoom.ko) ? (
                <BookmarkCheck size={16} className="text-amber-300" />
              ) : (
                <Bookmark size={16} />
              )}
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => setZoom(null)}
              aria-label={t("close")}
              className="rounded-full border border-white/20 p-3 text-slate-400 transition hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 표현 카드 — 대표(main)는 크게, 보조는 컴팩트하게 */
function PhraseCard({
  p,
  locale,
  main,
  speaking,
  onSpeak,
  savedNow,
  onSave,
  saveLabel,
  listenLabel,
}: {
  p: KPhrase;
  locale: KLocale;
  main: boolean;
  speaking: boolean;
  onSpeak: () => void;
  savedNow: boolean;
  onSave: () => void;
  saveLabel: string;
  listenLabel: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        main
          ? "border-amber-400/40 bg-amber-400/[0.06] sm:p-5"
          : "border-white/10 bg-slate-900/50"
      }`}
    >
      <p className="text-xs font-semibold text-slate-400">{p.situation[locale]}</p>
      <p
        className={`mt-1.5 font-extrabold leading-snug text-white ${
          main ? "text-2xl sm:text-3xl" : "text-lg"
        }`}
      >
        {p.ko}
      </p>
      <p className={`mt-1 text-amber-300/80 ${main ? "text-sm" : "text-xs"}`}>{p.roman}</p>
      <p className={`mt-0.5 text-slate-400 ${main ? "text-sm" : "text-xs"}`}>
        {p.meaning[locale]}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onSpeak}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/15"
        >
          <Volume2 size={13} className={speaking ? "animate-pulse text-amber-300" : ""} />
          {listenLabel}
        </button>
        <button
          type="button"
          onClick={onSave}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            savedNow
              ? "bg-amber-400/20 text-amber-300"
              : "bg-white/10 text-slate-200 hover:bg-white/15"
          }`}
        >
          {savedNow ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

/** 상황 퀴즈 한 문항 — 고르면 바로 정오 표시와 해설 */
function QuizCard({ q, locale }: { q: KQuiz; locale: KLocale }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
      <p className="text-sm font-bold leading-relaxed text-white">{q.prompt[locale]}</p>
      <div className="mt-3 space-y-2">
        {q.options.map((o, i) => {
          const isPicked = picked === i;
          const revealed = picked !== null;
          return (
            <button
              key={i}
              type="button"
              disabled={revealed}
              onClick={() => setPicked(i)}
              className={`flex w-full items-center gap-2.5 rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                revealed && o.correct
                  ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
                  : isPicked
                    ? "border-rose-400/60 bg-rose-400/10 text-rose-200"
                    : "border-white/10 bg-slate-950/40 text-slate-300 enabled:hover:border-amber-300/40"
              }`}
            >
              {revealed && o.correct ? (
                <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
              ) : isPicked ? (
                <XCircle size={15} className="shrink-0 text-rose-400" />
              ) : (
                <span className="h-[15px] w-[15px] shrink-0 rounded-full border border-white/25" />
              )}
              {o.text[locale]}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className="mt-3 rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-xs leading-relaxed text-slate-300">
          💡 {q.feedback[locale]}
        </p>
      )}
    </div>
  );
}
