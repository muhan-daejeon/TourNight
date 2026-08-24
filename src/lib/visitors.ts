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
 * 스팟 주소 기준 해당 구의 최근 가용 7일 일평균 방문객(외지인+외국인).
 *
 * 한국관광공사 데이터랩을 요청 시점에 호출한다(kto-stats). 통계 공개가 며칠
 * 밀리므로 모듈이 가용한 최근 7일을 찾아 준다.
 */
export async function getAreaVisitors(addr: string): Promise<AreaVisitors | null> {
  const gu = Object.keys(SIGNGU_CD).find((g) => addr.includes(g));
  if (!gu) return null;

  try {
    const code = SIGNGU_CD[gu];
    const rows = (await getVisitorRows()).filter(
      // 외지인(2)·외국인(3)만 — 현지인은 관광 수요로 보기 어렵다
      (r) => r.signguCode === code && (r.touDivCd === "2" || r.touDivCd === "3"),
    );
    if (rows.length === 0) return null;

    // 같은 날짜의 외지인+외국인을 합치고, 날짜별 합계를 평균낸다
    const byDay = new Map<string, number>();
    for (const r of rows) {
      byDay.set(r.baseYmd, (byDay.get(r.baseYmd) ?? 0) + Number(r.touNum));
    }
    const sum = [...byDay.values()].reduce((a, b) => a + b, 0);
    const latest = [...byDay.keys()].sort().at(-1) ?? "";

    return {
      gu,
      dailyAvg: Math.round(sum / byDay.size),
      basisMonth: latest ? `${latest.slice(0, 4)}-${latest.slice(4, 6)}` : "",
    };
  } catch {
    return null;
  }
}
