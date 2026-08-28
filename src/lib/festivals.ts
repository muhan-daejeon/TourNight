import type { NightSpot } from "./kto";
import { getFestivalPeriod, type FestivalPeriod } from "./kto-live";

/** past = 지난해 회차만 등록된 축제 — 올해 일정이 아직 없다는 뜻이지 끝났다는 뜻이 아니다 */
export type FestivalStatus = "ongoing" | "upcoming" | "ended" | "past";

export interface FestivalWithPeriod extends NightSpot {
  period: FestivalPeriod | null;
  status: FestivalStatus | null;
  /** 예정이면 며칠 남았는지 */
  daysUntil: number | null;
}

const ymd = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

function statusOf(p: FestivalPeriod, today: string): { status: FestivalStatus; daysUntil: number | null } {
  // 공사에 등록된 기간이 지난해 것이면(올해 일정 미등록) '종료'가 아니라 '지난 회차'로 본다.
  // 해마다 열리는 축제라 "작년 10.18 – 11.2 개최"가 사용자에게 훨씬 쓸모 있다.
  if (p.end.slice(0, 4) < today.slice(0, 4)) return { status: "past", daysUntil: null };
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
  const rank: Record<string, number> = { ongoing: 0, upcoming: 1, past: 2, ended: 3 };
  return rows.sort((a, b) => {
    const ra = a.status ? rank[a.status] : 4;
    const rb = b.status ? rank[b.status] : 4;
    if (ra !== rb) return ra - rb;
    if (a.status === "upcoming" && b.status === "upcoming") return (a.daysUntil ?? 0) - (b.daysUntil ?? 0);
    return (a.period?.start ?? "").localeCompare(b.period?.start ?? "");
  });
}
