// 스팟 간 도보·대중교통 경로 수집 — TMap 보행자 경로 + 대중교통
// 사용법: npm run db:routes            (아직 없는 구간만 계산 — 여러 번 나눠 돌려도 됨)
//         npm run db:routes -- --force (전부 다시 계산)
//
// 왜 배치인가: TMap 앱키는 콘솔에서 허용 IP를 걸 수 있고 Vercel 출구 IP는 고정이 아니라
// 런타임 호출이 불가능하다. 등록된 개발 PC에서 미리 계산해 DB에 넣고 앱은 읽기만 한다.
// 덤으로 무료 호출 한도·API 장애가 사용자 경험에 영향을 주지 않는다.
//
// 대상 구간: 각 스팟에서 가까운 NEIGHBORS곳 (코스는 인근 스팟으로만 구성되므로 충분).
// 방향별로 따로 계산한다 — 버스는 상·하행 정류장이 달라 역방향이 같지 않다.
import postgres from "postgres";

const PED = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1";
const TRA = "https://apis.openapi.sk.com/transit/routes";
const NEIGHBORS = 6; // 스팟당 인근 몇 곳까지 계산할지

const force = process.argv.includes("--force");
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmap(url, body, attempt = 1) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", appKey: process.env.TMAP_API_KEY },
      body: JSON.stringify(body),
    });
    const text = await res.text();

    // 허용 IP 제한은 원인을 모르면 한참 헤매므로 현재 공인 IP까지 찍어준다
    if (text.includes("ACCESS_DENIED")) {
      const ip = await fetch("https://api.ipify.org")
        .then((r) => r.text())
        .catch(() => "확인 실패");
      throw new Error(
        `허용 IP가 아닙니다. TMap 콘솔 앱 설정에 현재 IP(${ip})를 등록하거나 IP 제한을 해제하세요.`,
      );
    }
    if (text.includes("INVALID_API_KEY")) {
      throw new Error("앱키가 거부됐습니다. 키 값과 상품(보행자 경로/대중교통) 신청 상태를 확인하세요.");
    }
    // 429는 속도 제한이다(일일 한도가 아니라 짧은 시간 내 호출량).
    // 잠시 쉬면 바로 풀리므로 넉넉히 기다렸다 재시도한다.
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
    if (!text.trim()) return null; // 간혹 빈 본문이 온다
    return JSON.parse(text);
  } catch (err) {
    // 키·IP 문제는 재시도해도 소용없으니 즉시 중단
    if (/허용 IP|앱키가/.test(err.message)) throw err;
    const rateLimited = err.message === "RATE_LIMIT";
    const max = rateLimited ? 6 : 3;
    if (attempt >= max) throw err;
    await sleep(rateLimited ? 3000 * attempt : 500 * attempt ** 2);
    return tmap(url, body, attempt + 1);
  }
}

/** "lng,lat lng,lat ..." → [[lng,lat], ...] */
function parseLinestring(s) {
  return s
    .trim()
    .split(" ")
    .map((pair) => pair.split(",").map(Number))
    .filter((p) => p.length === 2 && p.every(Number.isFinite));
}

async function walkRoute(a, b) {
  const j = await tmap(PED, {
    startX: a.lng, startY: a.lat, endX: b.lng, endY: b.lat,
    startName: "출발", endName: "도착",
    reqCoordType: "WGS84GEO", resCoordType: "WGS84GEO",
  });
  const features = j?.features;
  if (!features?.length) return { status: "no_route", legs: [] };

  const props = features[0].properties;
  const path = features
    .filter((f) => f.geometry.type === "LineString")
    .flatMap((f) => f.geometry.coordinates);
  if (!path.length) return { status: "no_route", legs: [] };

  return {
    status: "ok",
    durationSec: props.totalTime ?? null,
    distanceM: props.totalDistance ?? null,
    legs: [{ mode: "WALK", route: null, durationSec: props.totalTime ?? null, distanceM: props.totalDistance ?? null, path }],
  };
}

async function transitRoute(a, b) {
  const j = await tmap(TRA, {
    startX: String(a.lng), startY: String(a.lat),
    endX: String(b.lng), endY: String(b.lat), count: 1,
  });
  const it = j?.metaData?.plan?.itineraries?.[0];
  if (!it) {
    // 가까워서 대중교통을 안 쓰는 경우와 진짜 경로가 없는 경우를 구분한다.
    // 전자는 도보 안내가 정답이므로 UI에서 다르게 처리해야 한다.
    const msg = j?.result?.message ?? "";
    return { status: msg.includes("가까움") ? "too_close" : "no_route", legs: [] };
  }

  const legs = it.legs.map((l) => ({
    mode: l.mode, // WALK / BUS / SUBWAY ...
    route: l.route ?? null,
    durationSec: l.sectionTime ?? null,
    distanceM: l.distance ?? null,
    // 탈것은 passShape에, 도보는 steps 배열에 좌표가 나뉘어 온다
    path: l.passShape?.linestring
      ? parseLinestring(l.passShape.linestring)
      : (l.steps ?? []).flatMap((s) => parseLinestring(s.linestring ?? "")),
  }));

  return {
    status: "ok",
    durationSec: it.totalTime ?? null,
    distanceM: it.totalDistance ?? null,
    transferCount: it.transferCount ?? null,
    fare: it.fare?.regular?.totalFare ?? null,
    legs,
  };
}

try {
  if (!process.env.TMAP_API_KEY) throw new Error("TMAP_API_KEY가 설정되지 않았습니다");

  const spots = await sql`
    select content_id, title, st_x(geom) as lng, st_y(geom) as lat
    from night_spots
    where night_verified = true and image_url is not null
  `;
  const byId = new Map(spots.map((s) => [s.content_id, s]));

  // 각 스팟의 인근 NEIGHBORS곳 (PostGIS 거리순) — 코스에 실제로 쓰이는 조합
  const neighbors = await sql`
    select s.content_id as from_id, n.content_id as to_id
    from night_spots s
    cross join lateral (
      select o.content_id
      from night_spots o
      where o.night_verified = true and o.image_url is not null
        and o.content_id <> s.content_id
      order by s.geom <-> o.geom
      limit ${NEIGHBORS}
    ) n
    where s.night_verified = true and s.image_url is not null
  `;

  const done = force
    ? new Set()
    : new Set(
        (await sql`select from_content_id, to_content_id, mode from spot_route where status = 'ok'`)
          .map((r) => `${r.from_content_id}|${r.to_content_id}|${r.mode}`),
      );

  const jobs = [];
  for (const { from_id, to_id } of neighbors) {
    for (const mode of ["walk", "transit"]) {
      if (!done.has(`${from_id}|${to_id}|${mode}`)) jobs.push({ from_id, to_id, mode });
    }
  }
  console.log(
    `구간 ${neighbors.length}개 × 2모드 = ${neighbors.length * 2}건 중 ${jobs.length}건 계산 필요` +
      (force ? " (--force)" : " (이미 성공한 건 건너뜀)"),
  );

  let ok = 0, none = 0, close = 0, failed = 0;
  for (const [i, job] of jobs.entries()) {
    const a = byId.get(job.from_id);
    const b = byId.get(job.to_id);

    // 한 구간이 실패해도 배치 전체를 멈추지 않는다. 저장하지 않으면
    // 다음 실행에서 자동으로 다시 대상이 된다.
    let r;
    try {
      r = job.mode === "walk" ? await walkRoute(a, b) : await transitRoute(a, b);
    } catch (err) {
      if (/허용 IP|앱키가/.test(err.message)) throw err; // 이건 계속해도 소용없음
      failed++;
      console.warn(`  ! ${a.title} → ${b.title} (${job.mode}): ${err.message}`);
      continue;
    }

    await sql`
      insert into spot_route (from_content_id, to_content_id, mode, status,
                              duration_sec, distance_m, transfer_count, fare, legs, updated_at)
      values (${job.from_id}, ${job.to_id}, ${job.mode}, ${r.status},
              ${r.durationSec ?? null}, ${r.distanceM ?? null},
              ${r.transferCount ?? null}, ${r.fare ?? null}, ${sql.json(r.legs)}, now())
      on conflict (from_content_id, to_content_id, mode) do update set
        status = excluded.status, duration_sec = excluded.duration_sec,
        distance_m = excluded.distance_m, transfer_count = excluded.transfer_count,
        fare = excluded.fare, legs = excluded.legs, updated_at = now()
    `;

    if (r.status === "ok") ok++;
    else if (r.status === "too_close") close++;
    else none++;

    if ((i + 1) % 20 === 0 || i === jobs.length - 1) {
      console.log(`  ${i + 1}/${jobs.length} — 성공 ${ok} · 근거리 ${close} · 경로없음 ${none}`);
    }
    await sleep(400); // 속도 제한(429) 회피 — 초당 2~3건 수준으로 유지
  }

  console.log(
    `\n완료 — 성공 ${ok} · 근거리 ${close} · 경로없음 ${none}` +
      (failed ? `, 실패 ${failed}건 (다시 실행하면 재시도)` : ""),
  );
} catch (err) {
  console.error(`\n중단: ${err.message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
