import type { NightSpot } from "./kto";
import { getFestivalPeriod, type FestivalPeriod } from "./kto-live";

export type FestivalStatus = "ongoing" | "upcoming" | "ended";

export interface FestivalWithPeriod extends NightSpot {
  period: FestivalPeriod | null;
  status: FestivalStatus | null;
  /** 예정이면 며칠 남았는지 */
  daysUntil: number | null;
}

const ymd = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

function statusOf(p: FestivalPeriod, today: string): { status: FestivalStatus; daysUntil: number | null } {
  if (today < p.start) {
    const a = new Date(+p.start.slice(0, 4), +p.start.slice(4, 6) - 1, +p.start.slice(6, 8));
    const b = new Date(+today.slice(0, 4), +today.slice(4, 6) - 1, +today.slice(6, 8));
    return { status: "upcoming", daysUntil: Math.round((a.getTime() - b.getTime()) / 86400000) };
  }
  if (today > p.end) return { status: "ended", daysUntil: null };
  return { status: "ongoing", daysUntil: null };
}

/**
 * 축제 목록에 개최 기간을 붙이고 진행 중 → 예정(가까운 순) → 종료 → 기간 미상 순으로 정렬.
 * 기간 조회는 부가 정보라 실패해도 축제 자체는 남긴다.
 */
export async function withPeriods(festivals: NightSpot[]): Promise<FestivalWithPeriod[]> {
  const today = ymd(new Date());
  const rows = await Promise.all(
    festivals.map(async (f) => {
      const period = await getFestivalPeriod(f.contentId).catch(() => null);
      const st = period ? statusOf(period, today) : { status: null, daysUntil: null };
      return { ...f, period, ...st };
    }),
  );
  const rank: Record<string, number> = { ongoing: 0, upcoming: 1, ended: 2 };
  return rows.sort((a, b) => {
    const ra = a.status ? rank[a.status] : 3;
    const rb = b.status ? rank[b.status] : 3;
    if (ra !== rb) return ra - rb;
    if (a.status === "upcoming" && b.status === "upcoming") return (a.daysUntil ?? 0) - (b.daysUntil ?? 0);
    return (a.period?.start ?? "").localeCompare(b.period?.start ?? "");
  });
}
