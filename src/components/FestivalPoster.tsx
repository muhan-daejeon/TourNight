"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import type { NightSpot } from "@/lib/kto";
import type { FestivalWithPeriod } from "@/lib/festivals";
import PlaceCard, { PlaceChip } from "./PlaceCard";

/**
 * 축제 카드 — 야경명소 목록과 같은 카드(PlaceCard)를 쓴다.
 *
 * 전에는 사진 아래 흰 캡션이 붙은 포스터 모양이라, 명소 탭에서 넘어오면 같은
 * 서비스가 아닌 것처럼 보였다. 기간은 제목 위 칩으로, 진행 상태는 분류 배지
 * 옆으로 옮겨 카드 틀을 명소와 맞췄다.
 *
 * 축제를 누르면 명소 상세로 간다 — 지도·교통·가이드가 이미 거기 다 있다.
 * 축제는 검수 목록에 없으므로 상세 조회가 축제 목록에서 한 번 더 찾는다.
 */
/** "20260912" → "9.12" */
const md = (s: string) => `${+s.slice(4, 6)}.${+s.slice(6, 8)}`;

// 끝난 축제는 아예 받아오지 않으므로 상태는 진행 중 / 예정 둘뿐이다
const STATUS_STYLE: Record<string, string> = {
  ongoing: "bg-emerald-500 text-white",
  upcoming: "bg-amber-400 text-slate-950",
};

export default function FestivalPoster({
  spot,
}: {
  spot: NightSpot | FestivalWithPeriod;
}) {
  const t = useTranslations("home");
  const tf = useTranslations("festivals");
  const period = "period" in spot ? spot.period : null;
  const status = "status" in spot ? spot.status : null;
  const daysUntil = "daysUntil" in spot ? spot.daysUntil : null;

  return (
    <PlaceCard
      href={`/spots/${spot.contentId}`}
      imageUrl={spot.imageUrl}
      title={spot.title}
      subtitle={spot.addr}
      badge={{
        label: t("categories.festival"),
        Icon: Sparkles,
        className: "text-pink-300",
      }}
      status={
        status
          ? {
              label:
                status === "upcoming" && daysUntil != null
                  ? tf("dday", { n: daysUntil })
                  : tf(status),
              className: STATUS_STYLE[status],
            }
          : undefined
      }
      chips={
        period ? (
          <PlaceChip className="bg-amber-400 text-slate-950">
            {md(period.start)} – {md(period.end)}
          </PlaceChip>
        ) : undefined
      }
      scene="from-fuchsia-950 via-slate-900 to-rose-950"
      fallbackIcon={Sparkles}
    />
  );
}
