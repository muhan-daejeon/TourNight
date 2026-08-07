import { sql } from "./db";
import type { SpotTransit, TransitRoute } from "./transit-format";

export type { SpotTransit, TransitRoute } from "./transit-format";

interface Row {
  content_id: string;
  node_name: string | null;
  distance_m: number | null;
  routes: TransitRoute[];
  last_bus: string | null;
}

const toTransit = (r: Row): SpotTransit => ({
  contentId: r.content_id,
  nodeName: r.node_name,
  distanceM: r.distance_m,
  routes: Array.isArray(r.routes) ? r.routes : [],
  lastBus: r.last_bus,
});

/** 스팟 여러 곳의 교통 정보를 한 번에 조회 (코스 카드용) */
export async function getTransitForSpots(
  contentIds: string[],
): Promise<Map<string, SpotTransit>> {
  if (!contentIds.length) return new Map();
  try {
    const rows = await sql<Row[]>`
      select content_id, node_name, distance_m, routes, last_bus
      from spot_transit where content_id = any(${contentIds})
    `;
    return new Map(rows.map((r) => [r.content_id, toTransit(r)]));
  } catch (err) {
    // 교통 정보는 부가 정보 — 실패해도 코스·상세는 그대로 보여준다
    console.warn(
      "[transit] 조회 실패 — 교통 정보 없이 표시합니다:",
      err instanceof Error ? err.message : err,
    );
    return new Map();
  }
}

/** 스팟 상세용 단건 조회 */
export async function getSpotTransit(
  contentId: string,
): Promise<SpotTransit | null> {
  const map = await getTransitForSpots([contentId]);
  return map.get(contentId) ?? null;
}
