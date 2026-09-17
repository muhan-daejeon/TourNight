"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import type { EtiquetteItem } from "@/lib/etiquette-items";

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
export default function DoDontSlider({
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

      {/* 높이는 화면의 1/3을 넘지 않게 — 전체 화면 가이드에서 사진 때문에
          스크롤이 생기지 않도록. 큰 창에선 16:9가, 작은 창에선 높이 캡이 이긴다 */}
      <div className="relative mx-auto aspect-video max-h-[34vh] w-full overflow-hidden rounded-xl bg-slate-100">
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
