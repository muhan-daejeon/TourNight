/** 대전 택시 심야 할증 — 23:00~04:00 20%. 요금은 주간 기준으로 저장하고 화면에서 환산한다 */
export const TAXI_NIGHT_SURCHARGE = 0.2;

/**
 * 교통 정보의 타입과 순수 포맷터 — 클라이언트 컴포넌트에서도 쓰므로 DB 의존이 없어야 한다.
 * (DB 조회는 서버 전용인 transit.ts에 있다)
 */

export interface TransitRoute {
  routeNo: string;
  firstTime: string; // HHMM
  lastTime: string; // HHMM
  intervalMin: number | null;
  endNode: string;
}

export interface SpotTransit {
  contentId: string;
  /** 정류장이 없으면 null (반경 500m 내 대전 정류장 없음 → 택시·차량 권장) */
  nodeName: string | null;
  distanceM: number | null;
  routes: TransitRoute[];
  /** 경유노선 중 가장 늦은 막차 (HHMM), 없으면 null */
  lastBus: string | null;
}

/** "2230" → "22:30" (자정 넘긴 막차는 그대로 00:10 형태) */
export function formatBusTime(hhmm: string): string {
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2)}`;
}

/** 막차가 22시 이전이면 일찍 끊기는 노선 — UI에서 강조 */
export function isEarlyLastBus(hhmm: string): boolean {
  const n = Number(hhmm);
  return n >= 400 && n < 2200;
}
