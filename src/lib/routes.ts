import { sql } from "./db";

/**
 * 스팟 간 실제 이동 경로 — 도보는 TMap, 대중교통은 ODsay.
 *
 * 코스가 만들어질 때 그 코스의 구간만 계산한다 (구간 2~3개 × 2모드 = 호출 4~6번).
 * 계산 결과는 spot_route에 캐시하므로 같은 구간이 다시 나오면 호출하지 않는다.
 *
 * 키가 없거나 호출이 실패하면 null을 돌려준다 — 경로는 부가 정보라
 * 없으면 지도가 기존처럼 직선을 그리면 된다.
 */

// 도보는 TMap 보행자 경로 (무료 한도 넉넉).
const PED = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1";
// 택시는 TMap 자동차 경로 — 응답의 taxiFare가 주간 기준 예상 요금이다.
const CAR = "https://apis.openapi.sk.com/tmap/routes?version=1";

// 대중교통은 ODsay. TMap 대중교통은 무료 한도가 하루 10회뿐이라 코스 3~4번이면
// 소진돼 온디맨드로 못 쓴다 (실측). ODsay는 1,000회/일이고 IP 제한도 없다.
const TRANSIT = "https://api.odsay.com/v1/api/searchPubTransPathT";

/** ODsay trafficType → 지도에서 쓰는 수단 코드 */
const ODSAY_MODE: Record<number, string> = { 1: "SUBWAY", 2: "BUS", 3: "WALK" };

/**
 * ODsay 키에 등록된 Service URI. 이 값으로 Referer를 보내야 인증된다.
 * 배포 도메인이 바뀌면 ODsay 콘솔의 등록 URI와 함께 ODSAY_REFERER를 바꾸면 된다.
 */
const ODSAY_REFERER =
  process.env.ODSAY_REFERER ?? "https://tournight.vercel.app/";

/** 도보를 기본으로 권할 최대 거리 — 이보다 멀면 걷기가 비현실적이라 대중교통을 앞세운다 */
export const WALKABLE_MAX_M = 1500;

export type RouteMode = "walk" | "transit" | "taxi";
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
  /** 승차 정류장 (탈것 구간만, 예전 캐시에는 없을 수 있다) */
  startName?: string | null;
  /** 하차 정류장 */
  endName?: string | null;
  /** 지나는 정류장 수 */
  stationCount?: number | null;
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

/** 한 구간에서 고를 수 있는 이동수단들 */
export interface RouteSet {
  walk: SpotRoute | null;
  transit: SpotRoute | null;
  taxi: SpotRoute | null;
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

/** 도보(TMap)·대중교통(ODsay) 중 하나라도 쓸 수 있으면 경로 조회를 시도한다 */
export function isRoutingConfigured(): boolean {
  return Boolean(process.env.TMAP_API_KEY || process.env.ODSAY_API_KEY);
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

interface Point {
  contentId: string;
  mapX: number;
  mapY: number;
}

/** 좌표가 사실상 같은 지점인지 (약 20m 이내) */
function samePlace(a: Point, b: Point): boolean {
  return Math.abs(a.mapX - b.mapX) < 0.0002 && Math.abs(a.mapY - b.mapY) < 0.0002;
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

/** 택시 — TMap 자동차 경로. 요금(taxiFare)은 주간 기준이라 화면에서 심야 할증을 더한다 */
async function fetchTaxi(a: Point, b: Point): Promise<SpotRoute> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const j: any = await tmap(CAR, {
    startX: a.mapX, startY: a.mapY, endX: b.mapX, endY: b.mapY,
    reqCoordType: "WGS84GEO", resCoordType: "WGS84GEO",
    searchOption: "0", // 교통최적 + 추천
    trafficInfo: "N",
  });
  const features = j?.features;
  const empty: SpotRoute = {
    mode: "taxi", status: "no_route", durationSec: null, distanceM: null,
    transferCount: null, fare: null, legs: [],
  };
  if (!features?.length) return empty;

  const props = features[0].properties;
  const path: [number, number][] = features
    .filter((f: any) => f.geometry?.type === "LineString")
    .flatMap((f: any) => f.geometry.coordinates);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (!path.length) return empty;

  return {
    mode: "taxi",
    status: "ok",
    durationSec: props.totalTime ?? null,
    distanceM: props.totalDistance ?? null,
    transferCount: null,
    fare: props.taxiFare ?? null,
    legs: [
      {
        mode: "TAXI",
        route: null,
        durationSec: props.totalTime ?? null,
        distanceM: props.totalDistance ?? null,
        path,
      },
    ],
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchTransit(a: Point, b: Point): Promise<SpotRoute> {
  const none = (status: RouteStatus): SpotRoute => ({
    mode: "transit", status,
    durationSec: null, distanceM: null, transferCount: null, fare: null, legs: [],
  });
  // 키가 없을 때 no_route를 돌려주면 그게 캐시에 박혀, 나중에 키를 넣어도
  // 계속 '경로 없음'으로 남는다. 던져서 캐시를 타지 않게 한다.
  if (!process.env.ODSAY_API_KEY) throw new Error("ODSAY_API_KEY가 없습니다");

  const params = new URLSearchParams({
    apiKey: process.env.ODSAY_API_KEY,
    SX: String(a.mapX), SY: String(a.mapY),
    EX: String(b.mapX), EY: String(b.mapY),
    OPT: "0", // 추천 경로
    output: "json",
  });
  // ODsay 키는 발급 시 등록한 Service URI에 묶여 있어, Referer로 그 도메인을
  // 밝히지 않으면 ApiKeyAuthFailed가 난다. 서버 fetch는 Referer를 안 보내므로
  // 직접 넣어준다 (로컬 개발에서도 등록 도메인을 그대로 쓴다).
  const res = await fetch(`${TRANSIT}?${params}`, {
    headers: { Referer: ODSAY_REFERER },
    signal: AbortSignal.timeout(8000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ODsay ${res.status}: ${text.slice(0, 120)}`);
  const j: any = JSON.parse(text);

  // 오류는 배열로 온다: {"error":[{"code","message"}]}
  const err = Array.isArray(j.error) ? j.error[0] : j.error;
  if (err) {
    const msg = String(err.message ?? err.msg ?? "");
    // 출발·도착이 가까우면 대중교통 대신 도보를 안내해야 하므로 따로 구분한다
    if (/가까|near|too close/i.test(msg)) return none("too_close");
    throw new Error(`ODsay 오류 ${err.code}: ${msg}`);
  }
  const path = j?.result?.path?.[0];
  if (!path) return none("no_route");

  const info = path.info ?? {};
  const legs: RouteLeg[] = (path.subPath ?? []).map((sp: any) => {
    const mode = ODSAY_MODE[sp.trafficType] ?? "WALK";
    // 기본 폴리라인은 경유 정류장 좌표를 이은 근사 — 아래 loadLane이 성공하면
    // 실제 도로 형상으로 교체된다
    const stations = sp.passStopList?.stations ?? [];
    return {
      mode,
      route: sp.lane?.[0]?.busNo ?? sp.lane?.[0]?.name ?? null,
      durationSec: sp.sectionTime ? sp.sectionTime * 60 : null, // ODsay는 분 단위
      distanceM: sp.distance ?? null,
      path: stations
        .map((st: any) => [Number(st.x), Number(st.y)] as [number, number])
        .filter((p: [number, number]) => p.every(Number.isFinite)),
      // "어느 정류장에서 타서 어디서 내리는지" — 화면 안내에 필요
      startName: mode === "WALK" ? null : (sp.startName ?? null),
      endName: mode === "WALK" ? null : (sp.endName ?? null),
      stationCount:
        mode === "WALK" ? null : (sp.stationCount ?? stations.length ?? null),
    };
  });

  // 실제 도로 형상 (loadLane) — 정류장 직선 근사는 골목을 가로질러 보여
  // "버스가 저렇게 다니나?" 싶게 그려진다. 한 경로당 호출 1번이라 부담이 작고,
  // 실패하면 정류장 근사를 그대로 쓴다.
  if (info.mapObj) {
    try {
      const laneParams = new URLSearchParams({
        apiKey: process.env.ODSAY_API_KEY,
        mapObject: `0:0@${info.mapObj}`,
        output: "json",
      });
      const laneRes = await fetch(
        `https://api.odsay.com/v1/api/loadLane?${laneParams}`,
        { headers: { Referer: ODSAY_REFERER }, signal: AbortSignal.timeout(8000) },
      );
      const laneJ: any = JSON.parse(await laneRes.text());
      const lanes = laneJ?.result?.lane ?? [];
      // lane 순서는 탈것 구간 순서와 같다
      const vehicleLegs = legs.filter((l) => l.mode !== "WALK");
      lanes.forEach((lane: any, i: number) => {
        const pts: [number, number][] = (lane.section ?? [])
          .flatMap((sec: any) => sec.graphPos ?? [])
          .map((p: any) => [Number(p.x), Number(p.y)] as [number, number])
          .filter((p: [number, number]) => p.every(Number.isFinite));
        if (pts.length > 1 && vehicleLegs[i]) vehicleLegs[i].path = pts;
      });
    } catch {
      // 형상 조회 실패는 무시 — 정류장 근사 폴리라인 유지
    }
  }

  // 도보 구간은 좌표가 없다. 앞뒤 탈것 구간의 끝점을 이어 선이 끊기지 않게 한다.
  for (let i = 0; i < legs.length; i++) {
    if (legs[i].path.length) continue;
    const prev = legs[i - 1]?.path.at(-1) ?? ([a.mapX, a.mapY] as [number, number]);
    const next = legs[i + 1]?.path[0] ?? ([b.mapX, b.mapY] as [number, number]);
    legs[i].path = [prev, next];
  }

  const transfers =
    (info.busTransitCount ?? 0) + (info.subwayTransitCount ?? 0);
  return {
    mode: "transit",
    status: "ok",
    durationSec: info.totalTime ? info.totalTime * 60 : null,
    distanceM: info.totalDistance ?? null,
    transferCount: Math.max(0, transfers - 1),
    fare: info.payment ?? null,
    legs,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * 다시 호출해도 결과가 바뀌지 않는 실패인지.
 *
 * ODsay -98은 출·도착이 700m 이내라 대중교통을 안내하지 않는 경우고,
 * TMap 3102는 보행자 경로가 없는 구간이다. 둘 다 좌표가 그대로인 한 영구적이다.
 */
function isPermanentFailure(message: string): boolean {
  return (
    /오류 -98/.test(message) || // ODsay: 700m 이내
    /"code":"310[0-9]"/.test(message) || // TMap: 지원되지 않는 구간
    /400/.test(message)
  );
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
): Promise<Map<string, RouteSet>> {
  const out = new Map<string, RouteSet>();
  if (!legs.length) return out;
  for (const l of legs)
    out.set(`${l.from.contentId}|${l.to.contentId}`, {
      walk: null,
      transit: null,
      taxi: null,
    });

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

  if (!isRoutingConfigured()) return out;

  // 2) 빠진 것만 호출.
  // 한꺼번에 병렬로 쏘면 TMap 속도 제한(429)에 걸려 절반이 실패하므로 순차로 돈다.
  // 구간 2~3개 × 2모드 = 4~6번뿐이라 순차여도 몇 초면 끝난다.
  const todo = legs.flatMap((l) => {
    const entry = out.get(`${l.from.contentId}|${l.to.contentId}`)!;
    // 같은 장소에서 열리는 축제처럼 좌표가 겹치면 경로를 물어봐야 소용없다.
    // (TMap은 출발=도착이면 좌표계 오류를 돌려준다)
    if (samePlace(l.from, l.to)) {
      for (const m of ["walk", "transit", "taxi"] as const) {
        entry[m] ??= {
          mode: m, status: "too_close",
          durationSec: null, distanceM: null,
          transferCount: null, fare: null, legs: [],
        };
      }
      return [];
    }
    const modes: RouteMode[] = [];
    if (!entry.walk) modes.push("walk");
    if (!entry.transit) modes.push("transit");
    if (!entry.taxi) modes.push("taxi");
    return modes.map((mode) => ({ leg: l, mode, entry }));
  });

  // 공급자별로 줄을 나눠 병렬로 돈다.
  // 도보·택시는 TMap, 대중교통은 ODsay라 속도 제한을 서로 공유하지 않는다.
  // 같은 공급자 안에서만 간격을 두면 되고, 전체 시간은 두 줄 중 긴 쪽으로 줄어든다.
  // (한 줄로 순차 처리하면 9회에 5초가 걸렸다)
  const queues: Record<"tmap" | "odsay", typeof todo> = { tmap: [], odsay: [] };
  for (const job of todo) {
    queues[job.mode === "transit" ? "odsay" : "tmap"].push(job);
  }

  const runQueue = async (jobs: typeof todo) => {
    for (const [i, job] of jobs.entries()) {
      if (i > 0) await new Promise((r) => setTimeout(r, 250));
      try {
        const r =
          job.mode === "walk"
            ? await fetchWalk(job.leg.from, job.leg.to)
            : job.mode === "taxi"
              ? await fetchTaxi(job.leg.from, job.leg.to)
              : await fetchTransit(job.leg.from, job.leg.to);
        job.entry[job.mode] = r;
        await cache(job.leg.from.contentId, job.leg.to.contentId, r);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `[routes] ${job.mode} 경로 실패 (${job.leg.from.contentId}→${job.leg.to.contentId}):`,
          message,
        );
        // 다시 물어봐도 같은 답이 오는 실패는 기록해 둔다. 그러지 않으면
        // 빌드할 때마다 같은 구간을 또 부른다 (언어 4개 × 코스 구간마다).
        // 타임아웃·5xx 같은 일시적 실패는 남기지 않는다 — 다음엔 될 수 있다.
        if (isPermanentFailure(message)) {
          const noRoute: SpotRoute = {
            mode: job.mode,
            status: "no_route",
            durationSec: null,
            distanceM: null,
            transferCount: null,
            fare: null,
            legs: [],
          };
          job.entry[job.mode] = noRoute;
          await cache(job.leg.from.contentId, job.leg.to.contentId, noRoute);
        }
      }
    }
  };

  await Promise.all([runQueue(queues.tmap), runQueue(queues.odsay)]);

  return out;
}
