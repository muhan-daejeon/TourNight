// KTO 연관 관광지(차량 이동 기반) 수집 — TarRlteTarService1/areaBasedList1
// 대전 시군구별 연관쌍을 받아, 기준·연관이 모두 우리 야간명소인 쌍만 저장한다.
// (연관지에 좌표가 없어 지도 표시가 안 되므로, 좌표 있는 우리 스팟쌍만 = 코스 '함께 방문' 배지용)
// 사용법: npm run db:related   (월 단위 데이터라 월 1회 재실행 권장)
import postgres from "postgres";

const SIGNGU_CODES = ["30110", "30140", "30170", "30200", "30230"];
const BASE = "https://apis.data.go.kr/B551011/TarRlteTarService1/areaBasedList1";

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) =>
  (s || "").replace(/\s+/g, "").replace(/[()·/]/g, "").toLowerCase();

/** 최근 8개월 중 데이터가 있는 baseYm을 찾는다 (연관 통계는 몇 달 지연) */
function candidateMonths() {
  const now = new Date();
  const out = [];
  for (let i = 1; i <= 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

async function fetchSigngu(signguCd, baseYm) {
  const items = [];
  let page = 1;
  let total = Infinity;
  while (items.length < total) {
    const params = new URLSearchParams({
      serviceKey: process.env.KTO_API_KEY,
      MobileOS: "ETC",
      MobileApp: "TourNight",
      _type: "json",
      numOfRows: "1000",
      pageNo: String(page),
      baseYm,
      areaCd: "30",
      signguCd,
    });
    const res = await fetch(`${BASE}?${params}`);
    if (!res.ok) return items;
    const body = (await res.json())?.response?.body;
    total = body?.totalCount ?? 0;
    const chunk = body?.items?.item ?? [];
    if (chunk.length === 0) break;
    items.push(...chunk);
    page += 1;
    await sleep(120);
  }
  return items;
}

try {
  const spots = await sql`
    select content_id, title from night_spots
    where night_verified = true and image_url is not null
  `;
  const byNorm = new Map(spots.map((s) => [norm(s.title), s.content_id]));

  // 데이터 있는 baseYm 탐색
  let baseYm = null;
  for (const ym of candidateMonths()) {
    const probe = await fetchSigngu("30230", ym);
    if (probe.length > 0) {
      baseYm = ym;
      break;
    }
  }
  if (!baseYm) {
    console.log("연관 관광지 데이터를 찾지 못했습니다 (최근 8개월).");
    process.exit(0);
  }
  console.log(`기준월 ${baseYm} 사용`);

  const edges = new Map(); // key: cid|rid -> rank
  for (const signgu of SIGNGU_CODES) {
    const items = await fetchSigngu(signgu, baseYm);
    for (const it of items) {
      const cid = byNorm.get(norm(it.tAtsNm));
      const rid = byNorm.get(norm(it.rlteTatsNm));
      if (!cid || !rid || cid === rid) continue;
      const key = `${cid}|${rid}`;
      const rank = Number(it.rlteRank) || null;
      if (!edges.has(key)) edges.set(key, rank);
    }
  }

  await sql`delete from spot_related`;
  for (const [key, rank] of edges) {
    const [cid, rid] = key.split("|");
    await sql`
      insert into spot_related (content_id, related_content_id, rank, base_ym)
      values (${cid}, ${rid}, ${rank}, ${baseYm})
      on conflict (content_id, related_content_id)
      do update set rank = excluded.rank, base_ym = excluded.base_ym
    `;
  }
  console.log(`연관쌍 ${edges.size}개 저장 (우리 야간명소끼리)`);
} finally {
  await sql.end();
}
