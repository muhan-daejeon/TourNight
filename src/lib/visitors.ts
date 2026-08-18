import { getVisitorRows } from "./kto-stats";

/** 주소의 구 이름 → 시군구 코드 */
const SIGNGU_CD: Record<string, string> = {
  동구: "30110",
  중구: "30140",
  서구: "30170",
  유성구: "30200",
  대덕구: "30230",
};

export interface AreaVisitors {
  gu: string; // "유성구"
  dailyAvg: number; // 일평균 외지+외국인 방문객
  basisMonth: string; // "2026-07"
}

/**
 * 스팟 주소 기준 해당 구의 일평균 방문객(외지인+외국인).
 * 원천은 저장하지 않고 KTO 빅데이터 API를 실시간 조회한다(응답만 캐시).
 */
export async function getAreaVisitors(addr: string): Promise<AreaVisitors | null> {
  const gu = Object.keys(SIGNGU_CD).find((g) => addr.includes(g));
  if (!gu) return null;

  try {
    const rows = await getVisitorRows();
    // 외지인(2)·외국인(3)만 — 현지인은 관광 수요로 보기 어렵다
    const mine = rows.filter(
      (r) => r.signguCd === SIGNGU_CD[gu] && (r.touDiv === "2" || r.touDiv === "3"),
    );
    if (!mine.length) return null;

    // 날짜별 합계를 낸 뒤 평균 (외지인+외국인을 하루 단위로 합산)
    const byDate = new Map<string, number>();
    for (const r of mine) {
      byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.num);
    }
    const daily = [...byDate.values()];
    const avg = daily.reduce((a, b) => a + b, 0) / daily.length;
    const latest = [...byDate.keys()].sort().at(-1) ?? "";

    return {
      gu,
      dailyAvg: Math.round(avg),
      basisMonth: latest.slice(0, 7),
    };
  } catch {
    return null;
  }
}
