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

/** 이 시간 이하로 걸어갈 수 있으면 굳이 차를 타지 않는다 */
const WALKABLE_MIN = 15;

interface LegRoutes {
  walk?: { status: string; durationSec: number | null } | null;
  transit?: { status: string; durationSec: number | null } | null;
  taxi?: { status: string; durationSec: number | null } | null;
}

/**
 * 한 구간에서 실제로 권할 이동수단.
 * 걸어서 15분 이내면 도보(야경을 보며 걷는 편이 낫다), 그다음 대중교통,
 * 둘 다 마땅치 않을 때만 택시를 권한다. 어느 것도 없으면 null.
 */
export function pickBestMode(
  leg: LegRoutes,
): "walk" | "transit" | "taxi" | null {
  const ok = (r?: { status: string } | null) => r?.status === "ok";
  const min = (r?: { durationSec: number | null } | null) =>
    Math.round((r?.durationSec ?? 0) / 60);

  if (ok(leg.walk) && min(leg.walk) <= WALKABLE_MIN) return "walk";
  if (ok(leg.transit)) {
    // 대중교통이 걷는 것보다 느리면(기다림 포함) 걷는 게 낫다
    if (ok(leg.walk) && min(leg.walk) <= min(leg.transit)) return "walk";
    return "transit";
  }
  if (ok(leg.taxi)) return "taxi";
  if (ok(leg.walk)) return "walk";
  return null;
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
