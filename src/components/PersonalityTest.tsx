"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  BarChart3,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  ImageIcon,
  ListChecks,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  OPTION_KEYS,
  QUESTIONS,
  QUESTION_TIMES,
  scorePersonality,
  type OptionKey,
} from "@/lib/personality-test";
import { PERSONA_INTRO_IMAGE, PERSONA_QUESTION_IMAGES } from "@/lib/persona-images";
import PersonalityResultView from "./PersonalityResultView";

type Phase = "intro" | "quiz" | "analyzing" | "result";

/**
 * 야간관광 여행성향 시뮬레이션 테스트 (기획 목업 전체 흐름).
 *
 * 소개 → 12문항 → 분석 중 → 결과 요약(자세히 보기) 상세 분석·탭.
 * 채점은 lib/personality-test, 결과 화면 자체는 PersonalityResultView(마스코트·
 * 추천 코스·스팟 포함) — 프로필의 "내 여행 성향 확인하기"와 같이 쓴다.
 * 선택지 일러스트가 없는 문항(아직 사진을 안 받은 문항)만 아이콘 자리표시자로 둔다.
 */
export default function PersonalityTest() {
  const t = useTranslations("personality");
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});

  const result = useMemo(
    () => (phase === "result" ? scorePersonality(answers) : null),
    [phase, answers],
  );

  // 결과에 도달할 때마다 서버에 한 건 남긴다 — 프로필의 "내 여행 성향
  // 확인하기"가 이 중 가장 최근 것을 읽는다. StrictMode가 개발 모드에서
  // 이 effect를 두 번 부르는 걸 ref로 막아 중복 저장을 피한다
  const savedResultRef = useRef<string | null>(null);
  useEffect(() => {
    if (!result) return;
    const key = `${result.primary}:${result.secondary}:${JSON.stringify(result.scores)}`;
    if (savedResultRef.current === key) return;
    savedResultRef.current = key;
    fetch("/api/personality/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primary: result.primary,
        secondary: result.secondary,
        scores: result.scores,
      }),
    }).catch(() => {});
  }, [result]);

  function restart() {
    setAnswers({});
    setIndex(0);
    setPhase("intro");
  }

  // ── 인트로(테스트 소개) ────────────────────────────────────
  if (phase === "intro") {
    const HOW: { key: string; Icon: typeof ListChecks }[] = [
      { key: "how1", Icon: ListChecks },
      { key: "how2", Icon: BarChart3 },
      { key: "how3", Icon: UserRound },
      { key: "how4", Icon: Camera },
    ];
    return (
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50">
        <div className="grid gap-8 p-8 sm:grid-cols-[1.4fr_1fr] sm:p-11">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              {t("introTitle")}
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
              {t("introBody")}
            </p>
            <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {HOW.map(({ key, Icon }, i) => (
                <div key={key}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                    <Icon size={20} />
                  </div>
                  <p className="mt-3 text-[13px] font-bold text-white">
                    {i + 1}. {t(`${key}.title`)}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">
                    {t(`${key}.body`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/25 via-purple-700/20 to-slate-900">
            {PERSONA_INTRO_IMAGE ? (
              <Image
                src={PERSONA_INTRO_IMAGE}
                alt=""
                fill
                sizes="(min-width: 640px) 40vw, 100vw"
                className="object-cover"
              />
            ) : (
              <>
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_40%,rgba(165,180,252,0.35),transparent_70%)]" />
                <Sparkles size={48} className="relative text-indigo-200/80" />
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-slate-950/40 px-8 py-5 sm:px-11">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
            <ListChecks size={13} /> {t("metaCount", { count: QUESTIONS.length })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
            <Clock size={13} /> {t("metaTime")}
          </span>
          <button
            type="button"
            onClick={() => setPhase("quiz")}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-indigo-500 px-7 py-3 text-sm font-bold text-white shadow-[0_0_28px_rgba(99,102,241,0.4)] transition hover:bg-indigo-400"
          >
            {t("start")}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── 분석 중 ────────────────────────────────────────────────
  if (phase === "analyzing") {
    return <Analyzing t={t} onDone={() => setPhase("result")} />;
  }

  // ── 결과 ───────────────────────────────────────────────────
  if (phase === "result" && result) {
    return (
      <PersonalityResultView
        primary={result.primary}
        secondary={result.secondary}
        scores={result.scores}
        onRestart={restart}
      />
    );
  }

  // ── 문항 ───────────────────────────────────────────────────
  const q = QUESTIONS[index];
  const selected = answers[q.id];
  const progress = ((index + 1) / QUESTIONS.length) * 100;
  const isLast = index === QUESTIONS.length - 1;
  // q.id는 "q1".."q12" — 사진은 앞의 몇 문항만 있고(persona:images 스크립트로
  // 생성), 없는 문항은 기존 아이콘 자리표시자로 자연히 대체된다
  const qOptionImages = PERSONA_QUESTION_IMAGES[q.id.replace(/^q/, "")];

  const goNext = () => {
    if (!selected) return;
    if (isLast) setPhase("analyzing");
    else setIndex(index + 1);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50">
      {/* 진행바 + 시간 배지 */}
      <div className="border-b border-white/10 px-6 py-5 sm:px-9">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold">
          <span className="tabular-nums text-slate-300">
            {String(index + 1).padStart(2, "0")} / {QUESTIONS.length}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-2.5 py-1 text-indigo-200">
            <Clock size={12} />
            {QUESTION_TIMES[index]}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="p-6 sm:p-9">
        <h2 className="text-lg font-bold leading-snug text-white sm:text-xl">
          {t(`questions.${q.id}.text`)}
        </h2>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {OPTION_KEYS.map((key) => {
            const on = selected === key;
            const optionImage = qOptionImages?.[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setAnswers((p) => ({ ...p, [q.id]: key }))}
                className={`group overflow-hidden rounded-2xl border text-left transition ${
                  on
                    ? "border-indigo-400 bg-indigo-500/10"
                    : "border-white/10 bg-slate-950/40 hover:border-indigo-300/50"
                }`}
              >
                <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                  {optionImage ? (
                    <Image
                      src={optionImage}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 25vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <ImageIcon size={22} className="text-slate-600" />
                  )}
                  <span
                    className={`absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold uppercase ${
                      on ? "bg-indigo-500 text-white" : "bg-slate-950/70 text-slate-300"
                    }`}
                  >
                    {key}
                  </span>
                </div>
                <p className="px-4 py-3 text-sm leading-relaxed text-slate-200">
                  {t(`questions.${q.id}.${key}`)}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-7 flex items-center gap-3">
          <button
            type="button"
            onClick={() => (index > 0 ? setIndex(index - 1) : setPhase("intro"))}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            <ChevronLeft size={15} />
            {t("prev")}
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!selected}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-indigo-500 px-7 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLast ? t("seeResult") : t("next")}
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// 분석 중 — 0→100% 진행 후 결과로
function Analyzing({
  t,
  onDone,
}: {
  t: ReturnType<typeof useTranslations>;
  onDone: () => void;
}) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const started = performance.now();
    const DURATION = 1800;
    let raf = 0;
    const tick = () => {
      const p = Math.min(100, ((performance.now() - started) / DURATION) * 100);
      setPct(Math.round(p));
      if (p < 100) raf = requestAnimationFrame(tick);
      else setTimeout(onDone, 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-10 text-center sm:p-16">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
        <Sparkles size={30} className="animate-pulse" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-white">{t("analyzingTitle")}</h2>
      <p className="mt-2 text-sm text-slate-400">{t("analyzingBody")}</p>
      <div className="mx-auto mt-8 h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-sm font-bold tabular-nums text-indigo-300">
        {t("analyzingProgress", { pct })}
      </p>
    </div>
  );
}
