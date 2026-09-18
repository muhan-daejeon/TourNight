"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  { key: 1, href: "/personality", bar: "bg-daejeon-orange", cta: "text-daejeon-orange", image: "/mystyle.jpg" },
  { key: 2, href: "/stamp-tour", bar: "bg-daejeon-orange", cta: "text-daejeon-orange", image: "/picture.png" },
  // K-Life 카드는 통합 페이지(/etiquette)로 — 이미지는 팀 디자인 유지
  { key: 3, href: "/etiquette", bar: "bg-daejeon-orange", cta: "text-daejeon-orange", image: "/klife.jpg" },
];

const GAP = 12; // gap-3 — 스크롤 한 걸음 계산에 쓴다
// 끝→처음, 처음→끝이 자연스럽게 이어지도록 실제 슬라이드 앞뒤에 마지막·
// 처음 슬라이드를 하나씩 복제해 둔다. EXTENDED[1..SLIDES.length]가 진짜다
const EXTENDED = [SLIDES[SLIDES.length - 1], ...SLIDES, SLIDES[0]];

/** 슬라이드별 비주얼 — 기능마다 지정된 이미지를 그대로 보여준다.
 * priority로 항상 즉시 불러온다 — 끝단 복제 장(마지막→처음 루프용)이 지연
 * 로딩으로 아직 안 떠 있으면, 거기로 순간 이동하는 순간 로딩 중이던 그림이
 * 뒤늦게 팝업하듯 나타나며 끊기는 것처럼 보인다. 실제 파일은 3장뿐이라
 * 5칸(복제 2 + 진짜 3) 전부 즉시 불러와도 비용이 크지 않다 */
function Visual({ image }: { image: string }) {
  return (
    <div className="relative h-full w-full bg-slate-100">
      <Image
        src={image}
        alt=""
        fill
        priority
        sizes="(min-width:1024px) 640px, 100vw"
        className="object-cover"
      />
    </div>
  );
}

export default function FeatureShowcase() {
  const t = useTranslations("home");
  const track = useRef<HTMLDivElement>(null);
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

  // 복제 장(맨 끝)에 도착했으면 대응하는 진짜 장으로 애니메이션 없이 순간
  // 이동한다. 실행이 두 번 겹쳐도(예: scrollend와 겹칠 때) i가 이미 진짜
  // 장이라 두 번째 호출은 아무 일도 안 해 안전하다
  const correctIfClone = () => {
    const el = track.current;
    if (!el) return;
    const w = panelWidth();
    const cur = el.scrollLeft;
    const i = Math.round(cur / w);
    if (i === 0) {
      el.scrollLeft = w * SLIDES.length; // 복제(마지막) → 진짜 마지막
      setPos(SLIDES.length);
    } else if (i === EXTENDED.length - 1) {
      el.scrollLeft = w; // 복제(처음) → 진짜 처음
      setPos(1);
    }
  };

  // 브라우저 'scrollend'가 오면 확실히 다 멎은 뒤이니 그대로 보정한다(주
  // 경로 — 진행 중인 네이티브 스크롤 애니메이션과 겹쳐 다투지 않는다).
  // 일부 구형 브라우저는 scrollend가 없을 수 있어, 몇 프레임 연속 같은
  // 위치일 때도 같은 보정을 걸어 둔다(보조 경로) — 두 경로가 겹쳐 불려도
  // 위 correctIfClone이 이미 보정된 뒤엔 아무 일도 안 하니 안전하다
  const settleRafRef = useRef<number | null>(null);
  const startSettleWatch = () => {
    if (settleRafRef.current !== null) return;
    const el = track.current;
    if (!el) return;
    let lastLeft = el.scrollLeft;
    let stableFrames = 0;

    const tick = () => {
      const cur = el.scrollLeft;
      if (cur === lastLeft) {
        stableFrames++;
        // 5프레임(~80ms) 연속 같은 위치 — 이징 꼬리에서의 미세한 정지와
        // 헷갈리지 않을 만큼 넉넉히 잡아, 아직 움직이는 중인 네이티브 스크롤을
        // 우리가 임의로 끊어버리는 일이 없게 한다
        if (stableFrames >= 5) {
          settleRafRef.current = null;
          correctIfClone();
          return;
        }
      } else {
        stableFrames = 0;
        lastLeft = cur;
      }
      settleRafRef.current = requestAnimationFrame(tick);
    };
    settleRafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    el.addEventListener("scrollend", correctIfClone);
    return () => {
      el.removeEventListener("scrollend", correctIfClone);
      if (settleRafRef.current !== null) cancelAnimationFrame(settleRafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- correctIfClone은 매 렌더 새로 만들어지지만 el당 한 번만 붙이면 된다
  }, []);

  // 스크롤 도중에는 위치만 계속 갱신(좌측 텍스트가 그 자리에서 바로 바뀌게)하고,
  // 혹시 scrollend를 놓칠 경우를 대비해 보조 감시도 시작한다
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    setPos(Math.round(el.scrollLeft / panelWidth()));
    startSettleWatch();
  };

  const slide = SLIDES[(pos - 1 + SLIDES.length) % SLIDES.length];

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      {/* ── 좌: 기능 소개 — 스크롤 위치에 맞춰 그대로 바뀐다 (전환 효과 없음) ── */}
      <div>
        <p className="tn-enjoy-neon text-[16px] font-light tracking-wide text-daejeon-green">
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

      <style>{`
        .tn-enjoy-neon {
          animation: tn-enjoy-neon-glow 2s ease-in-out infinite;
        }
        @keyframes tn-enjoy-neon-glow {
          0%, 100% { text-shadow: 0 0 4px rgba(53, 181, 151, 0.5), 0 0 10px rgba(53, 181, 151, 0.25); }
          50% { text-shadow: 0 0 10px rgba(53, 181, 151, 0.9), 0 0 22px rgba(53, 181, 151, 0.55); }
        }
      `}</style>
    </div>
  );
}
