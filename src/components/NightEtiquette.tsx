"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import {
  Bus,
  CarTaxiFront,
  Store,
  TrainFront,
  UtensilsCrossed,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import { KLIFE_SITUATIONS, type KLifeTopic, type KScenario, type KSituation } from "@/lib/klife-scenarios";
import type { KLocale } from "@/lib/klife-restaurant";
import KLifeScenario from "./KLifeScenario";

const TOPIC_ICONS: Record<KLifeTopic, LucideIcon> = {
  transport: CarTaxiFront,
  convenience: Store,
  dining: UtensilsCrossed,
  oncheon: Waves,
};

/** 교통 팝업의 세 갈래 — 지하철·버스·택시 */
const SCENARIO_ICONS: Record<string, LucideIcon> = {
  subway: TrainFront,
  bus: Bus,
  taxi: CarTaxiFront,
};

/**
 * K-Life 가이드 첫 화면 — 상황 박스 네 개(교통·편의점·식당·온천/족욕)가 한 줄로.
 *
 * 박스를 누르면 페이지 안에서 펼쳐지는 대신 전체 화면(KLifeScenario)이 뜬다 —
 * ① Do/Don't ② STEP 1 ③ STEP 2 ④ STEP 3 ⑤ 퀴즈. 교통만 시나리오가 셋이라
 * (지하철·버스·택시) 누르면 고르는 팝업이 먼저 뜬다.
 *
 * 예전 13개 주제 그리드와 "이 상황에서 바로 쓰는 한국어"(표현집 발췌)는 이
 * 흐름에서 빠졌다 — 주제 사진·문구 자산(ETIQUETTE_ITEMS · messages
 * etiquette.items)은 그대로 있고 네 상황이 topic 키로 가져다 쓴다.
 */
export default function NightEtiquette({
  topicImages = {},
}: {
  /** 주제별 대표 사진 (서버에서 조회) — 없는 주제는 아이콘 카드로 표시 */
  topicImages?: Record<string, string>;
}) {
  const t = useTranslations("etiquette");
  const tk = useTranslations("klife");
  const locale = useLocale() as KLocale;
  // 교통처럼 시나리오가 여럿인 상황 — 어느 걸 볼지 고르는 팝업
  const [choosing, setChoosing] = useState<KSituation | null>(null);
  const [open, setOpen] = useState<{ situation: KSituation; scenario: KScenario } | null>(null);

  const pick = (situation: KSituation) => {
    if (situation.scenarios.length > 1) setChoosing(situation);
    else setOpen({ situation, scenario: situation.scenarios[0] });
  };

  useEffect(() => {
    if (!choosing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChoosing(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choosing]);

  return (
    <div className="mt-8" data-tour="etiquette">
      {/* 네 상황이 가로 한 줄 — 올리면 커지며 앞으로 나온다 (모바일은 2×2) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {KLIFE_SITUATIONS.map((s) => {
          const Icon = TOPIC_ICONS[s.topic];
          // 교통·식당은 팀이 지정한 사진으로 고정 — 실시간 명소 사진(교통) ·
          // 기본 사진(식당)을 덮어써 항상 이 사진이 뜨게 한다
          const image =
            s.topic === "transport" ? "/bus.jpg" : s.topic === "dining" ? "/food.jpg" : topicImages[s.topic];
          return (
            <button
              key={s.topic}
              type="button"
              onClick={() => pick(s)}
              className="group relative h-60 overflow-hidden rounded-2xl border border-slate-200 text-left shadow-sm transition duration-300 ease-out hover:z-10 hover:scale-[1.06] hover:border-amber-400 hover:shadow-[0_16px_40px_rgba(15,23,42,0.18)] focus-visible:z-10 focus-visible:scale-[1.06] focus-visible:border-amber-400 focus-visible:outline-none sm:h-[19.5rem]"
            >
              {image ? (
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className="object-cover transition duration-500 group-hover:scale-110"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
                  <Icon size={36} strokeWidth={1.3} className="text-slate-300" />
                </span>
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/10 transition group-hover:from-amber-950/90" />
              {/* 사진 + 어두운 그라데이션 위라 글자는 흰색이어야 읽힌다 */}
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3.5 text-base font-extrabold leading-tight text-white sm:text-lg">
                <Icon size={18} strokeWidth={2.2} className="shrink-0 text-amber-300" />
                <span className="transition group-hover:text-amber-300">{s.title[locale]}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* 교통 → 지하철·버스·택시 중 고르기 */}
      {choosing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("chooseTransport")}
          onClick={() => setChoosing(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="overline-label">{choosing.title[locale]}</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                  {t("chooseTransport")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setChoosing(null)}
                aria-label={tk("close")}
                className="shrink-0 rounded-full border border-slate-200 p-2 text-slate-400 transition hover:border-slate-300 hover:text-slate-900"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {choosing.scenarios.map((sc) => {
                const Icon = SCENARIO_ICONS[sc.id] ?? TOPIC_ICONS[choosing.topic];
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setOpen({ situation: choosing, scenario: sc });
                      setChoosing(null);
                    }}
                    className="group flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 transition duration-300 ease-out hover:scale-[1.05] hover:border-amber-400 hover:bg-white hover:shadow-[0_12px_32px_rgba(15,23,42,0.14)] focus-visible:border-amber-400 focus-visible:outline-none"
                  >
                    <Icon size={34} strokeWidth={1.5} className="text-slate-500 transition group-hover:text-amber-600" />
                    <span className="text-sm font-extrabold text-slate-900 sm:text-base">
                      {sc.title[locale]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {open && (
        <KLifeScenario
          key={open.scenario.id}
          situation={open.situation}
          scenario={open.scenario}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
