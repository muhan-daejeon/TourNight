"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * 투어나잇에서만 즐길 수 있는 기능 — 대표 기능 3종을 넘겨 보는 쇼케이스.
 * 좌측은 그 기능의 제목·설명·바로가기, 우측은 큰 비주얼이 옆으로 밀려
 * 넘어가는 필름스트립. 다음 기능의 조각이 오른쪽에 미리 보이고, 화살표를
 * 누르면 깜빡임 없이 그대로 밀려 온다(네이티브 부드러운 스크롤 — 팀 피드백:
 * 전환이 느껴지면 안 된다). 모바일은 스와이프.
 * 기능마다 대전 CI 색 하나를 포인트로 쓴다 (파랑·초록·주황).
 *
 * 세 번째(K-Life 가이드) 다음에 다시 첫 번째로, 첫 번째 이전에 다시 세
 * 번째로 — 끊기지 않고 계속 이어지도록 돈다. 실제 3장 앞뒤에 마지막·처음
 * 장을 하나씩 복제해 두고([복제(3) 1 2 3 복제(1)]), 복제 장에 스크롤이
 * 멎으면 애니메이션 없이 그에 대응하는 진짜 장으로 순간 이동시켜 — 사용자
 * 눈에는 계속 자연스럽게 넘어가는 것처럼 보인다.
 */

type SlideKey = 1 | 2 | 3;

const SLIDES: {
  key: SlideKey;
  href: string;
  bar: string; // 포인트 색 막대
  cta: string; // 바로가기 글자색
  image: string; // 슬라이드 대표 이미지
}[] = [
  { key: 1, href: "/personality", bar: "bg-daejeon-blue", cta: "text-daejeon-blue", image: "/mystyle.jpg" },
  { key: 2, href: "/stamp-tour", bar: "bg-daejeon-green", cta: "text-daejeon-green", image: "/picture.png" },
  // K-Life 카드는 통합 페이지(/etiquette)로 — 이미지는 팀 디자인 유지
  { key: 3, href: "/etiquette", bar: "bg-daejeon-orange", cta: "text-daejeon-orange", image: "/klife.jpg" },
];

const GAP = 12; // gap-3 — 스크롤 한 걸음 계산에 쓴다
// 끝→처음, 처음→끝이 자연스럽게 이어지도록 실제 슬라이드 앞뒤에 마지막·
// 처음 슬라이드를 하나씩 복제해 둔다. EXTENDED[1..SLIDES.length]가 진짜다
const EXTENDED = [SLIDES[SLIDES.length - 1], ...SLIDES, SLIDES[0]];

/** 슬라이드별 비주얼 — 기능마다 지정된 이미지를 그대로 보여준다 */
function Visual({ image }: { image: string }) {
  return (
    <div className="relative h-full w-full bg-slate-100">
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width:1024px) 640px, 100vw"
        className="object-cover"
      />
    </div>
  );
}

export default function FeatureShowcase() {
  const t = useTranslations("home");
  const track = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 화면에 보이는 위치는 복제분까지 포함한 EXTENDED 기준 — 1~3이 진짜 슬라이드
  const [pos, setPos] = useState(1);

  const panelWidth = () => {
    const el = track.current;
    const panel = el?.firstElementChild as HTMLElement | null;
    return (panel?.offsetWidth ?? 600) + GAP;
  };

  // 마운트 시 복제(마지막) 없이 곧장 첫 실제 슬라이드에서 시작 — 애니메이션
  // 없이(useLayoutEffect + 직접 scrollLeft 대입) 그려야 복제 장이 잠깐이라도
  // 보이는 깜빡임이 없다
  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    el.scrollLeft = panelWidth();
  }, []);

  const step = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * panelWidth(), behavior: "smooth" });
  };

  // 스크롤이 멎을 때마다(짧은 디바운스) 복제 장에 도착했는지 확인하고,
  // 도착했으면 대응하는 진짜 장으로 애니메이션 없이 순간 이동한다
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const w = panelWidth();
    const i = Math.round(el.scrollLeft / w);
    setPos(i);

    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (i === 0) {
        el.scrollLeft = w * SLIDES.length; // 복제(마지막) → 진짜 마지막
        setPos(SLIDES.length);
      } else if (i === EXTENDED.length - 1) {
        el.scrollLeft = w; // 복제(처음) → 진짜 처음
        setPos(1);
      }
    }, 120);
  };

  const slide = SLIDES[(pos - 1 + SLIDES.length) % SLIDES.length];

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      {/* ── 좌: 기능 소개 — 스크롤 위치에 맞춰 그대로 바뀐다 (전환 효과 없음) ── */}
      <div>
        <p className="text-[16px] font-light tracking-wide text-slate-400">
          {t("enjoyTitle")}
        </p>
        <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
          {t(`enjoy${slide.key}`)}
        </h2>
        <div className={`mt-5 h-1 w-12 rounded-full ${slide.bar}`} />
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-slate-600">
          {t(`enjoy${slide.key}Desc`)}
        </p>
        <Link
          href={slide.href}
          className={`mt-9 inline-flex items-center gap-2 text-sm font-bold ${slide.cta} transition hover:gap-3`}
        >
          {t(`enjoy${slide.key}Cta`)}
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* ── 우: 필름스트립 — 다음 슬라이드 조각이 옆에 미리 보인다 ── */}
      <div className="min-w-0">
        <div
          ref={track}
          onScroll={onScroll}
          className="tn-scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto"
        >
          {EXTENDED.map((s, i) => (
            <Link
              key={`${s.key}-${i}`}
              href={s.href}
              aria-label={t(`enjoy${s.key}`)}
              className="relative block h-72 w-full shrink-0 snap-start overflow-hidden sm:h-[420px] md:w-[calc(100%-6.75rem)] lg:w-[calc(100%-8.75rem)]"
            >
              <Visual image={s.image} />
            </Link>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={t("showcasePrev")}
            className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={t("showcaseNext")}
            className="flex size-11 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
