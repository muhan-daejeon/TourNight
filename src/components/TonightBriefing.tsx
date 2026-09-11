import { getLocale, getTranslations } from "next-intl/server";
import { Sunset, Thermometer, Umbrella } from "lucide-react";
import { getNightConditions } from "@/lib/conditions";
import LastTrainCountdown from "./LastTrainCountdown";

/** 무드 문구별로 노란 네온 강조할 단어 — 문구가 언어별로 4가지씩 고정돼 있으므로
 * 각 언어 번역문에서 같은 의미를 담은 부분을 직접 골라 매핑한다
 * (번역마다 문장 구조가 달라 자동 매칭이 어려워 언어별로 지정, 별도 LLM 호출 없이 빠르고 무료). */
const MOOD_HIGHLIGHTS: Record<string, Record<string, string[]>> = {
  ko: {
    wet: ["비 소식"],
    stars: ["맑은", "별"],
    moon: ["달맞이"],
    clear: ["대전의 밤"],
  },
  en: {
    wet: ["Rain"],
    stars: ["clear", "star"],
    moon: ["moonlit walk"],
    clear: ["Daejeon's night"],
  },
  ja: {
    wet: ["雨の気配"],
    stars: ["晴れた", "星"],
    moon: ["お月見"],
    clear: ["大田の夜"],
  },
  zh: {
    wet: ["有雨"],
    stars: ["晴", "星"],
    moon: ["赏月"],
    clear: ["大田的夜晚"],
  },
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHeadline(text: string, words: string[]) {
  if (words.length === 0) return text;
  const pattern = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "g");
  return text.split(pattern).map((part, i) =>
    words.includes(part) ? (
      <span key={i} className="neon-glow text-amber-300">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/**
 * 🌙 오늘 밤 브리핑 — 히어로 바로 아래의 "그래서 오늘 밤 뭐 하지"의 첫 답.
 * 박스 없이 헤드라인만 크게 보여주고, 온도·일몰·월령·막차 정보는
 * 헤드라인이 끝나는 우측 하단에 붙인다.
 */
export default async function TonightBriefing() {
  const c = await getNightConditions();
  if (!c) return null;
  const t = await getTranslations("briefing");
  const locale = await getLocale();
  const highlights = MOOD_HIGHLIGHTS[locale] ?? MOOD_HIGHLIGHTS.ko;

  const mood = c.precip
    ? ({ key: "wet" } as const)
    : c.starNight
      ? ({ key: "stars" } as const)
      : c.fullMoon
        ? ({ key: "moon" } as const)
        : ({ key: "clear" } as const);

  return (
    <section className="flex flex-col items-center text-center">
      <h2 className="text-[calc(1.875rem-2px)] font-bold leading-snug tracking-tight text-white sm:text-[calc(2.25rem-2px)]">
        {renderHeadline(t(`mood.${mood.key}`), highlights[mood.key] ?? [])}
      </h2>
      {/* 온도·일몰·월령·막차 — 예전 "별 보기 좋은 밤이에요" 문구와 같은 크기(text-xs)로,
          그보다 10px 더 아래로 내려서 헤드라인과 확실히 구분되게 둔다 */}
      <div className="mt-3 flex translate-y-[10px] flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
        {c.temp !== null && (
          <span className="flex items-center gap-1.5">
            <Thermometer size={14} className="text-sky-300" />
            <b className="text-white">{c.temp}°C</b>
          </span>
        )}
        {c.precip && (
          <span className="flex items-center gap-1 font-semibold text-sky-300">
            <Umbrella size={13} />
            {t(`precip.${c.precip}`)}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Sunset size={14} className="text-amber-300" />
          {t("sunset")} <b className="text-white">{c.sunset}</b>
        </span>
        <span>
          {c.moonEmoji} {t("moonAge", { age: Math.round(c.lunAge) })}
        </span>
        <LastTrainCountdown />
      </div>
    </section>
  );
}
