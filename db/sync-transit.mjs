// 스팟별 인근 버스 정류장·막차 수집 — TAGO 버스정류소정보 + 버스노선정보
// 사용법: npm run db:transit   (노선 운행시간은 자주 안 바뀌므로 주 1회면 충분)
//
// 파이프라인: 스팟 좌표 → 반경 500m 정류장 → 대전(citycode 25)만 → 최근접 1곳
//             → 그 정류장 경유노선 → 노선별 첫차/막차/배차간격
//
// 주의: getCrdntPrxmtSttnList는 인접 시·도(세종 12, 충남 34070 등) 정류장도 섞어서 돌려준다.
//       필터 없이 최근접만 쓰면 cityCode=25로는 경유노선이 0건이 되어 멀쩡한 스팟이 누락된다.
import postgres from "postgres";

const BASE = "https://apis.data.go.kr/1613000";
const CITY = "25"; // 대전
const MAX_ROUTES = 6; // 정류장당 조회할 경유노선 수 (막차 계산용)

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

/**
 * TAGO 호출 — 동시 세션 제한("가용한 세션이 존재하지 않습니다")과 간헐적 HTTP_ERROR가
 * 잦아서 재시도한다. 재시도 없이 돌리면 멀쩡한 스팟이 '정류장 없음'으로 기록된다.
 */
async function api(path, params, attempt = 1) {
  const qs = new URLSearchParams({
    serviceKey: process.env.KTO_API_KEY,
    _type: "json",
    ...params,
  });
  try {
    const res = await fetch(`${BASE}/${path}?${qs}`);
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`비정상 응답: ${text.slice(0, 100)}`);
    }
    const header = json?.response?.header;
    if (header?.resultCode && !["00", "0000"].includes(header.resultCode)) {
      throw new Error(header.resultMsg ?? header.resultCode);
    }
    // 인증/한도 오류는 본문이 OpenAPI_ServiceResponse로 온다
    if (json?.OpenAPI_ServiceResponse) {
      throw new Error(
        json.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg ?? "OpenAPI 오류",
      );
    }
    return arr(json?.response?.body?.items?.item);
  } catch (err) {
    if (attempt >= 4) throw new Error(`${path} → ${err.message}`);
    await sleep(400 * attempt ** 2); // 0.4s → 1.6s → 3.6s
    return api(path, params, attempt + 1);
  }
}

function haversineM(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** HHMM 문자열 비교용 — 자정 넘긴 막차(0010 등)는 24시 이후로 취급 */
function lastBusRank(hhmm) {
  const n = Number(hhmm);
  return n < 400 ? n + 2400 : n;
}

try {
  const spots = await sql`
    select content_id, title, st_x(geom) as lng, st_y(geom) as lat
    from night_spots
    where night_verified = true and image_url is not null
    order by title
  `;
  console.log(`대상 스팟 ${spots.length}곳`);

  let withStop = 0;
  let withLast = 0;
  let failed = 0;

  for (const spot of spots) {
    let node = null;
    let routes = [];
    try {
      const nearby = await api("BusSttnInfoInqireService/getCrdntPrxmtSttnList", {
        numOfRows: "10",
        gpsLati: String(spot.lat),
        gpsLong: String(spot.lng),
      });
      // 대전 정류장만 → 그중 최근접
      const daejeon = nearby.filter((n) => String(n.citycode) === CITY);
      node =
        daejeon
          .map((n) => ({
            ...n,
            dist: haversineM(spot.lat, spot.lng, Number(n.gpslati), Number(n.gpslong)),
          }))
          .sort((a, b) => a.dist - b.dist)[0] ?? null;

      if (node) {
        const via = await api("BusSttnInfoInqireService/getSttnThrghRouteList", {
          cityCode: CITY,
          nodeid: node.nodeid,
          numOfRows: String(MAX_ROUTES),
        });
        for (const rt of via.slice(0, MAX_ROUTES)) {
          const info = await api("BusRouteInfoInqireService/getRouteInfoIem", {
            cityCode: CITY,
            routeId: rt.routeid,
          });
          const d = info[0];
          if (!d?.endvehicletime) continue;
          routes.push({
            routeNo: String(d.routeno ?? rt.routeno ?? ""),
            firstTime: String(d.startvehicletime ?? ""),
            lastTime: String(d.endvehicletime),
            intervalMin: Number(d.intervaltime) || null,
            endNode: String(d.endnodenm ?? ""),
          });
          await sleep(80);
        }
      }
    } catch (err) {
      // 실패한 스팟은 기존 행을 건드리지 않는다 — null로 덮어써서 '정류장 없음'이 되면 안 됨
      failed++;
      console.warn(`  ! ${spot.title}: ${err.message} (기존 값 유지)`);
      continue;
    }

    routes.sort((a, b) => lastBusRank(b.lastTime) - lastBusRank(a.lastTime));
    const lastBus = routes[0]?.lastTime ?? null;
    if (node) withStop++;
    if (lastBus) withLast++;

    await sql`
      insert into spot_transit (content_id, node_id, node_name, distance_m, routes, last_bus, updated_at)
      values (${spot.content_id}, ${node?.nodeid ?? null}, ${node?.nodenm ?? null},
              ${node?.dist ?? null}, ${sql.json(routes)}, ${lastBus}, now())
      on conflict (content_id) do update set
        node_id = excluded.node_id, node_name = excluded.node_name,
        distance_m = excluded.distance_m, routes = excluded.routes,
        last_bus = excluded.last_bus, updated_at = now()
    `;

    console.log(
      `  ${spot.title.padEnd(20)} ${node ? `${node.nodenm}(${node.dist}m)` : "정류장 없음"}` +
        `${lastBus ? ` 막차 ${lastBus.slice(0, 2)}:${lastBus.slice(2)} · 노선 ${routes.length}개` : ""}`,
    );
    await sleep(80);
  }

  console.log(
    `\n완료 — 정류장 ${withStop}/${spots.length}곳, 막차 ${withLast}/${spots.length}곳` +
      (failed ? `, 실패 ${failed}곳(기존 값 유지)` : ""),
  );

  // 월 1회 무인 실행이라 전량 실패가 조용히 넘어가면 안 된다.
  // 절반 넘게 실패하면(키 만료·API 장애 등) 종료 코드로 알린다.
  if (failed > spots.length / 2) {
    console.error(
      `실패가 과반(${failed}/${spots.length})입니다 — 인증키 만료나 TAGO 장애를 확인하세요.`,
    );
    process.exitCode = 1;
  }
} finally {
  await sql.end();
}
