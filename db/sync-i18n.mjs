// KTO 다국어 관광정보 서비스(영/일/중 GW)에서 공식 번역 수집
// 언어별 contentid가 달라 좌표(120m 이내 최근접)로 우리 스팟과 매칭한다.
// 사용법: npm run db:i18n   (검증된 스팟 대상, 재실행 시 갱신)
import postgres from "postgres";

const LANG_SERVICES = {
  en: "EngService2",
  ja: "JpnService2",
  zh: "ChsService2", // 중문 간체
};
const MATCH_RADIUS_M = 120;

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function baseParams(extra) {
  return new URLSearchParams({
    serviceKey: process.env.KTO_API_KEY,
    MobileOS: "ETC",
    MobileApp: "TourNight",
    _type: "json",
    ...extra,
  });
}

async function fetchAll(service, extra) {
  const items = [];
  let page = 1;
  let total = Infinity;
  while (items.length < total) {
    const params = baseParams({
      numOfRows: "100",
      pageNo: String(page),
      arrange: "A",
      areaCode: "3",
      ...extra,
    });
    const res = await fetch(
      `https://apis.data.go.kr/B551011/${service}/areaBasedList2?${params}`,
    );
    if (!res.ok) throw new Error(`${service} ${res.status}`);
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

async function fetchOverview(service, contentId) {
  const params = baseParams({ contentId });
  const res = await fetch(
    `https://apis.data.go.kr/B551011/${service}/detailCommon2?${params}`,
  );
  if (!res.ok) return "";
  const data = await res.json();
  return data?.response?.body?.items?.item?.[0]?.overview ?? "";
}

// 대략적 미터 거리 (대전 위도 기준 근사)
function distM(lat1, lng1, lat2, lng2) {
  const dy = (lat1 - lat2) * 111_320;
  const dx = (lng1 - lng2) * 111_320 * Math.cos((36.35 * Math.PI) / 180);
  return Math.sqrt(dx * dx + dy * dy);
}

try {
  // 매칭 대상: 검증된 실데이터 스팟 (mock 제외 — KTO에 없는 곳들)
  const spots = await sql`
    select content_id, title, st_x(geom) as x, st_y(geom) as y
    from night_spots
    where night_verified = true and content_id not like 'mock-%'
  `;
  console.log(`매칭 대상 스팟: ${spots.length}건`);

  // ko: 우리 contentid 그대로, 국문 공식 개요 저장
  let koSaved = 0;
  for (const s of spots) {
    const exists = await sql`
      select 1 from spot_translations where content_id = ${s.content_id} and locale = 'ko'
    `;
    if (exists.length) continue;
    const overview = await fetchOverview("KorService2", s.content_id);
    await sql`
      insert into spot_translations (content_id, locale, lang_content_id, title, overview)
      values (${s.content_id}, 'ko', ${s.content_id}, ${s.title}, ${overview})
      on conflict (content_id, locale) do update
        set overview = excluded.overview, updated_at = now()
    `;
    koSaved += 1;
    await sleep(120);
  }
  console.log(`ko 개요 저장: ${koSaved}건`);

  for (const [locale, service] of Object.entries(LANG_SERVICES)) {
    const langItems = (await fetchAll(service, {})).filter(
      (it) => it.mapx && Number(it.mapx) !== 0,
    );
    console.log(`[${locale}] ${service} 목록 ${langItems.length}건 수신`);

    let matched = 0;
    for (const s of spots) {
      // 최근접 항목 찾기
      let best = null;
      let bestD = Infinity;
      for (const it of langItems) {
        const d = distM(s.y, s.x, Number(it.mapy), Number(it.mapx));
        if (d < bestD) {
          bestD = d;
          best = it;
        }
      }
      if (!best || bestD > MATCH_RADIUS_M) continue;

      const exists = await sql`
        select 1 from spot_translations where content_id = ${s.content_id} and locale = ${locale}
      `;
      if (exists.length) {
        matched += 1;
        continue;
      }
      const overview = await fetchOverview(service, best.contentid);
      await sql`
        insert into spot_translations (content_id, locale, lang_content_id, title, overview)
        values (${s.content_id}, ${locale}, ${best.contentid}, ${best.title}, ${overview})
        on conflict (content_id, locale) do update
          set lang_content_id = excluded.lang_content_id,
              title = excluded.title, overview = excluded.overview, updated_at = now()
      `;
      matched += 1;
      await sleep(120);
    }
    console.log(`[${locale}] 매칭·저장: ${matched}/${spots.length}건`);
  }
} finally {
  await sql.end();
}
