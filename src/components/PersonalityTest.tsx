"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ChevronLeft,
  Clock,
  ListChecks,
  Sparkles,
} from "lucide-react";
import {
  OPTION_KEYS,
  PERSONALITY_TYPES,
  QUESTIONS,
  QUESTION_TIMES,
  scorePersonality,
  type OptionKey,
} from "@/lib/personality-test";
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
export default function PersonalityTest({
  onSeeCourses,
}: {
  /** 결과 하단 "추천 코스 보기" — 코스 페이지 탭에 심어졌을 땐 AI 탭으로 전환,
      단독 페이지(/personality)에선 코스 페이지로 이동한다 (피드백 10) */
  onSeeCourses?: () => void;
} = {}) {
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
    // 마스코트 로테이션 — 팀 에셋(성향 캐릭터 7종)을 4마리씩 보이게 무한 슬라이드.
    // 트랙을 두 벌 이어 붙이고 -50%까지 밀면 이음새 없이 계속 돈다
    const marquee = [...PERSONALITY_TYPES, ...PERSONALITY_TYPES];
    return (
      <div className="py-6 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {t("introTitle")}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-500">
          {t("introBody")}
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
            <ListChecks size={13} /> {t("metaCount", { count: QUESTIONS.length })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
            <Clock size={13} /> {t("metaTime")}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setPhase("quiz")}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-daejeon-blue px-10 py-4 text-base font-bold text-white shadow-[0_8px_28px_rgba(0,78,162,0.35)] transition hover:bg-indigo-500"
        >
          {t("start")}
          <ArrowRight size={17} />
        </button>

        {/* 성향 캐릭터 퍼레이드 — 4마리씩 보이며 쉬지 않고 흐른다 */}
        <div className="relative mt-12 overflow-hidden" aria-hidden>
          <div className="tn-parade flex w-max items-end gap-8 sm:gap-12">
            {marquee.map((ty, i) => (
              <div key={i} className="flex w-32 shrink-0 flex-col items-center gap-2 sm:w-40">
                <span className="rounded-full bg-daejeon-blue px-3 py-1 text-[11px] font-extrabold text-white shadow">
                  {t(`axes.${ty}`)}
                </span>
                <Image
                  src={`/mascots/${ty}.png`}
                  alt=""
                  width={140}
                  height={140}
                  className="h-24 w-auto drop-shadow-[0_10px_18px_rgba(15,23,42,0.18)] sm:h-32"
                />
              </div>
            ))}
          </div>
          <style>{`
            .tn-parade { animation: tn-parade 13s linear infinite; }
            @keyframes tn-parade { to { transform: translateX(-50%); } }
          `}</style>
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
      <div>
        <PersonalityResultView
          primary={result.primary}
          secondary={result.secondary}
          scores={result.scores}
          onRestart={restart}
        />
        {/* 결과 → 맞춤코스로 이어지는 다리 (피드백 10) */}
        <div className="mt-8 text-center">
          {onSeeCourses ? (
            <button
              type="button"
              onClick={onSeeCourses}
              className="inline-flex items-center gap-2 rounded-full bg-daejeon-blue px-9 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,78,162,0.3)] transition hover:bg-indigo-500"
            >
              {t("seeCourses")}
              <ArrowRight size={16} />
            </button>
          ) : (
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-full bg-daejeon-blue px-9 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,78,162,0.3)] transition hover:bg-indigo-500"
            >
              {t("seeCourses")}
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ── 문항 ───────────────────────────────────────────────────
  const q = QUESTIONS[index];
  const selected = answers[q.id];
  const progress = ((index + 1) / QUESTIONS.length) * 100;
  const isLast = index === QUESTIONS.length - 1;
  // 선택하면 색이 바뀌는 걸 잠깐 보여주고 바로 다음 문항으로 넘어간다 (피드백 9)
  const choose = (key: OptionKey) => {
    setAnswers((p) => ({ ...p, [q.id]: key }));
    window.setTimeout(() => {
      if (isLast) setPhase("analyzing");
      else setIndex(index + 1);
    }, 260);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      {/* 진행바 + 시간 배지 */}
      <div className="border-b border-slate-200 px-6 py-5 sm:px-9">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold">
          <span className="tabular-nums text-slate-400">
            {String(index + 1).padStart(2, "0")} / {QUESTIONS.length}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-2.5 py-1 text-indigo-700">
            <Clock size={12} />
            {QUESTION_TIMES[index]}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="p-6 sm:p-9">
        <h2 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">
          {t(`questions.${q.id}.text`)}
        </h2>

        <div className="mt-6 flex flex-col gap-3">
          {OPTION_KEYS.map((key) => {
            const on = selected === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => choose(key)}
                className={`flex w-full items-center gap-3.5 rounded-2xl border px-5 py-4 text-left transition-all duration-150 ${
                  on
                    ? "scale-[1.01] border-daejeon-blue bg-indigo-50"
                    : "border-slate-200 bg-white hover:scale-[1.02] hover:border-indigo-300 hover:shadow-md"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold uppercase ${
                    on ? "bg-daejeon-blue text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {key}
                </span>
                <span className={`text-sm leading-relaxed sm:text-[15px] ${on ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                  {t(`questions.${q.id}.${key}`)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-7 flex items-center gap-3">
          <button
            type="button"
            onClick={() => (index > 0 ? setIndex(index - 1) : setPhase("intro"))}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-400 transition hover:text-slate-900"
          >
            <ChevronLeft size={15} />
            {t("prev")}
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
    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center sm:p-16">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-600">
        <Sparkles size={30} className="animate-pulse" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-slate-900">{t("analyzingTitle")}</h2>
      <p className="mt-2 text-sm text-slate-400">{t("analyzingBody")}</p>
      <div className="mx-auto mt-8 h-2 w-full max-w-sm overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-sm font-bold tabular-nums text-indigo-600">
        {t("analyzingProgress", { pct })}
      </p>
    </div>
  );
}
