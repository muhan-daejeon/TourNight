import { sql } from "./db";

/**
 * 스팟 간 실제 이동 경로 (TMap 보행자·대중교통).
 *
 * 코스가 만들어질 때 그 코스의 구간만 계산한다 (구간 2~3개 × 2모드 = 호출 4~6번).
 * 계산 결과는 spot_route에 캐시하므로 같은 구간이 다시 나오면 호출하지 않는다.
 *
 * TMAP_API_KEY가 없거나 호출이 실패하면 null을 돌려준다 — 경로는 부가 정보라
 * 없으면 지도가 기존처럼 직선을 그리면 된다.
 */

const PED = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1";
const TRA = "https://apis.openapi.sk.com/transit/routes";

/** 도보를 기본으로 권할 최대 거리 — 이보다 멀면 걷기가 비현실적이라 대중교통을 앞세운다 */
export const WALKABLE_MAX_M = 1500;

export type RouteMode = "walk" | "transit";
/** ok = 경로 있음, too_close = 너무 가까워 대중교통 불필요, no_route = 이동 경로 없음 */
export type RouteStatus = "ok" | "too_close" | "no_route";

export interface RouteLeg {
  /** WALK / BUS / SUBWAY / EXPRESSBUS ... */
  mode: string;
  /** 노선명 (예: "일반:301", "대전 1호선"). 도보는 null */
  route: string | null;
  durationSec: number | null;
  distanceM: number | null;
  /** [경도, 위도] 좌표열 — 카카오맵 Polyline에 그대로 사용 */
  path: [number, number][];
}

export interface SpotRoute {
  mode: RouteMode;
  status: RouteStatus;
  durationSec: number | null;
  distanceM: number | null;
  transferCount: number | null;
  fare: number | null;
  legs: RouteLeg[];
}

interface Row {
  mode: RouteMode;
  status: RouteStatus;
  duration_sec: number | null;
  distance_m: number | null;
  transfer_count: number | null;
  fare: number | null;
  legs: RouteLeg[];
}

const toRoute = (r: Row): SpotRoute => ({
  mode: r.mode,
  status: r.status,
  durationSec: r.duration_sec,
  distanceM: r.distance_m,
  transferCount: r.transfer_count,
  fare: r.fare,
  legs: Array.isArray(r.legs) ? r.legs : [],
});

export function isTmapConfigured(): boolean {
  return Boolean(process.env.TMAP_API_KEY);
}

async function tmap(
  url: string,
  body: unknown,
  attempt = 1,
): Promise<Record<string, never> | null> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      appKey: process.env.TMAP_API_KEY as string,
    },
    body: JSON.stringify(body),
    // 코스 생성 응답을 오래 붙잡지 않도록 짧게 끊는다
    signal: AbortSignal.timeout(8000),
  });
  const text = await res.text();

  // 429는 짧은 시간에 몰아친 경우다. 한 번만 쉬었다 다시 시도한다
  // (코스당 호출이 4~6번뿐이라 여기서 실패하면 그냥 직선 폴백이 낫다)
  if (res.status === 429 && attempt === 1) {
    await new Promise((r) => setTimeout(r, 1200));
    return tmap(url, body, 2);
  }
  if (!res.ok) throw new Error(`TMap ${res.status}: ${text.slice(0, 120)}`);
  if (!text.trim()) return null;
  return JSON.parse(text);
}

/** "lng,lat lng,lat ..." → [[lng,lat], ...] */
function parseLinestring(s: string): [number, number][] {
  return s
    .trim()
    .split(" ")
    .map((pair) => pair.split(",").map(Number) as [number, number])
    .filter((p) => p.length === 2 && p.every(Number.isFinite));
}

interface Point {
  contentId: string;
  mapX: number;
  mapY: number;
}

async function fetchWalk(a: Point, b: Point): Promise<SpotRoute> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const j: any = await tmap(PED, {
    startX: a.mapX, startY: a.mapY, endX: b.mapX, endY: b.mapY,
    startName: "출발", endName: "도착",
    reqCoordType: "WGS84GEO", resCoordType: "WGS84GEO",
  });
  const features = j?.features;
  const empty: SpotRoute = {
    mode: "walk", status: "no_route", durationSec: null, distanceM: null,
    transferCount: null, fare: null, legs: [],
  };
  if (!features?.length) return empty;

  const props = features[0].properties;
  const path: [number, number][] = features
    .filter((f: any) => f.geometry.type === "LineString")
    .flatMap((f: any) => f.geometry.coordinates);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (!path.length) return empty;

  return {
    mode: "walk",
    status: "ok",
    durationSec: props.totalTime ?? null,
    distanceM: props.totalDistance ?? null,
    transferCount: null,
    fare: null,
    legs: [
      {
        mode: "WALK",
        route: null,
        durationSec: props.totalTime ?? null,
        distanceM: props.totalDistance ?? null,
        path,
      },
    ],
  };
}

async function fetchTransit(a: Point, b: Point): Promise<SpotRoute> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const j: any = await tmap(TRA, {
    startX: String(a.mapX), startY: String(a.mapY),
    endX: String(b.mapX), endY: String(b.mapY),
    count: 1,
  });
  const it = j?.metaData?.plan?.itineraries?.[0];
  if (!it) {
    // 너무 가까워 대중교통이 없는 경우와 진짜 경로가 없는 경우는 안내가 달라야 한다
    const msg: string = j?.result?.message ?? "";
    return {
      mode: "transit",
      status: msg.includes("가까움") ? "too_close" : "no_route",
      durationSec: null, distanceM: null, transferCount: null, fare: null, legs: [],
    };
  }

  const legs: RouteLeg[] = it.legs.map((l: any) => ({
    mode: l.mode,
    route: l.route ?? null,
    durationSec: l.sectionTime ?? null,
    distanceM: l.distance ?? null,
    // 탈것은 passShape에, 도보는 steps 배열에 좌표가 나뉘어 온다
    path: l.passShape?.linestring
      ? parseLinestring(l.passShape.linestring)
      : (l.steps ?? []).flatMap((s: any) => parseLinestring(s.linestring ?? "")),
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return {
    mode: "transit",
    status: "ok",
    durationSec: it.totalTime ?? null,
    distanceM: it.totalDistance ?? null,
    transferCount: it.transferCount ?? null,
    fare: it.fare?.regular?.totalFare ?? null,
    legs,
  };
}

/** 캐시에 저장 (실패해도 무시 — 다음 요청에서 다시 계산하면 된다) */
async function cache(from: string, to: string, r: SpotRoute): Promise<void> {
  try {
    await sql`
      insert into spot_route (from_content_id, to_content_id, mode, status,
                              duration_sec, distance_m, transfer_count, fare, legs, updated_at)
      values (${from}, ${to}, ${r.mode}, ${r.status}, ${r.durationSec}, ${r.distanceM},
              ${r.transferCount}, ${r.fare},
              ${sql.json(r.legs as unknown as Parameters<typeof sql.json>[0])}, now())
      on conflict (from_content_id, to_content_id, mode) do update set
        status = excluded.status, duration_sec = excluded.duration_sec,
        distance_m = excluded.distance_m, transfer_count = excluded.transfer_count,
        fare = excluded.fare, legs = excluded.legs, updated_at = now()
    `;
  } catch (err) {
    console.warn(
      "[routes] 캐시 저장 실패:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * 코스 구간들의 도보·대중교통 경로를 한 번에 준비한다.
 * 캐시에 있으면 그대로, 없으면 TMap을 호출하고 저장한다.
 * 반환 키는 `${from}|${to}` 형식.
 */
export async function getRoutesForLegs(
  legs: { from: Point; to: Point }[],
): Promise<Map<string, { walk: SpotRoute | null; transit: SpotRoute | null }>> {
  const out = new Map<string, { walk: SpotRoute | null; transit: SpotRoute | null }>();
  if (!legs.length) return out;
  for (const l of legs) out.set(`${l.from.contentId}|${l.to.contentId}`, { walk: null, transit: null });

  // 1) 캐시 조회
  try {
    const rows = await sql<(Row & { from_content_id: string; to_content_id: string })[]>`
      select from_content_id, to_content_id, mode, status, duration_sec, distance_m,
             transfer_count, fare, legs
      from spot_route
      where from_content_id = any(${legs.map((l) => l.from.contentId)})
        and to_content_id = any(${legs.map((l) => l.to.contentId)})
    `;
    for (const r of rows) {
      const entry = out.get(`${r.from_content_id}|${r.to_content_id}`);
      if (entry) entry[r.mode] = toRoute(r);
    }
  } catch (err) {
    console.warn(
      "[routes] 캐시 조회 실패 — 새로 계산합니다:",
      err instanceof Error ? err.message : err,
    );
  }

  if (!isTmapConfigured()) return out;

  // 2) 빠진 것만 호출.
  // 한꺼번에 병렬로 쏘면 TMap 속도 제한(429)에 걸려 절반이 실패하므로 순차로 돈다.
  // 구간 2~3개 × 2모드 = 4~6번뿐이라 순차여도 몇 초면 끝난다.
  const todo = legs.flatMap((l) => {
    const entry = out.get(`${l.from.contentId}|${l.to.contentId}`)!;
    const modes: RouteMode[] = [];
    if (!entry.walk) modes.push("walk");
    if (!entry.transit) modes.push("transit");
    return modes.map((mode) => ({ leg: l, mode, entry }));
  });

  for (const [i, job] of todo.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 250));
    try {
      const r =
        job.mode === "walk"
          ? await fetchWalk(job.leg.from, job.leg.to)
          : await fetchTransit(job.leg.from, job.leg.to);
      job.entry[job.mode] = r;
      await cache(job.leg.from.contentId, job.leg.to.contentId, r);
    } catch (err) {
      console.warn(
        `[routes] ${job.mode} 경로 실패 (${job.leg.from.contentId}→${job.leg.to.contentId}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return out;
}
