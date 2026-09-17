"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export interface ShowcaseSpot {
  contentId: string;
  title: string;
  addr: string;
  imageUrl: string;
  /** KTO 소개문 첫 부분 (없으면 주소만 보여준다) */
  desc: string;
}

/**
 * 오늘 밤, 어디로 갈까요? — 좌측 제목 + 원형 화살표, 우측은 사진·설명 카드가
 * 가로로 흐르는 캐러셀. 화살표는 카드 한 장 폭만큼 밀고, 끝에 닿으면 비활성.
 * 터치에서는 그냥 옆으로 쓸어 넘기면 된다 (scroll-snap).
 */
export default function SpotShowcase({ spots }: { spots: ShowcaseSpot[] }) {
  const t = useTranslations("home");
  const track = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // "오늘 밤," 부분 — 사용자가 이 제목을 처음 마주하는 순간(화면에 들어오는
  // 순간)에만 검정 + 큰 네온광에서 노란색 + 무광으로 잦아드는 연출을 한 번 튼다
  const [tonightPlay, setTonightPlay] = useState(false);
  const tonightRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = tonightRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTonightPlay(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const step = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const gap = 20; // gap-5
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 300) + gap), behavior: "smooth" });
  };

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 4);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-14">
      {/* ── 좌: 제목 + 화살표 ── */}
      <div>
        <p className="text-sm font-semibold text-slate-500">{t("spotsSectionSub")}</p>
        <h2 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-daejeon-orange sm:text-4xl">
          {t.rich("spotsSection", {
            hl: (chunks) => (
              <span
                ref={tonightRef}
                className={tonightPlay ? "tn-tonight-reveal" : "tn-tonight-idle"}
              >
                {chunks}
              </span>
            ),
          })}
        </h2>
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={atStart}
            aria-label={t("showcasePrev")}
            className="flex size-11 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-300"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={atEnd}
            aria-label={t("showcaseNext")}
            className="flex size-11 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-300"
          >
            <ArrowRight size={18} />
          </button>
        </div>
        <Link
          href="/spots"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-daejeon-blue"
        >
          {t("spotsViewAll")} <ArrowRight size={15} />
        </Link>
      </div>

      {/* ── 우: 카드 캐러셀 ── */}
      <div
        ref={track}
        onScroll={onScroll}
        className="tn-scrollbar-none -mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-2 lg:mx-0 lg:px-0"
      >
        {spots.map((s) => (
          <Link
            key={s.contentId}
            href={`/spots/${s.contentId}`}
            className="group w-[240px] shrink-0 snap-start bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md sm:w-[280px]"
          >
            <div className="relative h-60 overflow-hidden bg-slate-200 sm:h-72">
              <Image
                src={s.imageUrl}
                alt={s.title}
                fill
                sizes="280px"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-5">
              <h3 className="line-clamp-1 text-lg font-bold text-slate-900 group-hover:text-daejeon-blue">
                {s.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                {s.desc || s.addr}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        .tn-tonight-idle {
          color: #000;
          text-shadow: 0 0 12px rgba(0, 0, 0, 0.9), 0 0 28px rgba(0, 0, 0, 0.7), 0 0 52px rgba(0, 0, 0, 0.5);
        }
        .tn-tonight-reveal {
          animation: tn-tonight-reveal 2.4s ease-out forwards;
        }
        @keyframes tn-tonight-reveal {
          0% {
            color: #000;
            text-shadow: 0 0 12px rgba(0, 0, 0, 0.9), 0 0 28px rgba(0, 0, 0, 0.7), 0 0 52px rgba(0, 0, 0, 0.5);
          }
          /* 검정 네온이 노란빛으로 완전히 옮겨간 지점 — 여기까진 색만 바뀌고
             (알파를 높게 유지해야 중간에 색이 죽지 않고 실제로 옮겨가 보인다),
             그 뒤로는 이미 노래진 빛만 옅어지며 사라진다 */
          55% {
            color: rgb(243, 152, 1);
            text-shadow: 0 0 8px rgba(243, 152, 1, 0.85), 0 0 18px rgba(243, 152, 1, 0.6), 0 0 34px rgba(243, 152, 1, 0.4);
          }
          100% {
            color: rgb(243, 152, 1);
            text-shadow: 0 0 0 rgba(243, 152, 1, 0);
          }
        }
      `}</style>
    </div>
  );
}
