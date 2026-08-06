import { sql } from "./db";

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

/** 스팟 주소 기준 해당 구의 최근 가용 7일 일평균 방문객(외지인+외국인) */
export async function getAreaVisitors(addr: string): Promise<AreaVisitors | null> {
  const gu = Object.keys(SIGNGU_CD).find((g) => addr.includes(g));
  if (!gu) return null;

  try {
    const rows = await sql<{ avg: string | null; latest: string | null }[]>`
      select avg(daily) as avg, to_char(max(base_ymd), 'YYYY-MM') as latest
      from (
        select base_ymd, sum(num) as daily
        from area_visitors
        where signgu_cd = ${SIGNGU_CD[gu]} and tou_div in ('2', '3') -- 외지인+외국인
        group by base_ymd
      ) t
    `;
    if (!rows[0]?.avg) return null;
    return {
      gu,
      dailyAvg: Math.round(Number(rows[0].avg)),
      basisMonth: rows[0].latest ?? "",
    };
  } catch {
    return null;
  }
}
