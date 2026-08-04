// 관광지 집중률 예측 수집 (KT 통신데이터 기반 향후 30일)
// TatsCnctrRateService의 관광지명(tAtsNm)을 우리 스팟 제목과 매칭해 저장한다.
// 사용법: npm run db:congestion   (예측치가 매일 갱신되므로 주기적 재실행 권장)
import postgres from "postgres";

const SIGNGU_CODES = ["30110", "30140", "30170", "30200", "30230"]; // 동·중·서·유성·대덕구

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.replace(/\s+/g, "").replace(/[()·]/g, "");

async function fetchSigngu(signguCd) {
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
      areaCd: "30",
      signguCd,
    });
    const res = await fetch(
      `https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRatedList?${params}`,
    );
    if (!res.ok) throw new Error(`집중률 API ${res.status}`);
    const body = (await res.json())?.response?.body;
    total = body?.totalCount ?? 0;
    const chunk = body?.items?.item ?? [];
    if (chunk.length === 0) break;
    items.push(...chunk);
    page += 1;
    await sleep(150);
  }
  return items;
}

try {
  const spots = await sql`
    select content_id, title from night_spots where night_verified = true
  `;
  const byNorm = new Map(spots.map((s) => [norm(s.title), s.content_id]));

  let matchedSpots = new Set();
  let rows = 0;
  for (const signgu of SIGNGU_CODES) {
    const items = await fetchSigngu(signgu);
    const names = new Set(items.map((it) => it.tAtsNm));
    console.log(`시군구 ${signgu}: 관광지 ${names.size}곳 × 예측 ${items.length}행`);
    for (const it of items) {
      const contentId = byNorm.get(norm(it.tAtsNm));
      if (!contentId) continue;
      const ymd = `${it.baseYmd.slice(0, 4)}-${it.baseYmd.slice(4, 6)}-${it.baseYmd.slice(6, 8)}`;
      await sql`
        insert into spot_congestion (content_id, base_ymd, rate)
        values (${contentId}, ${ymd}, ${Number(it.cnctrRate)})
        on conflict (content_id, base_ymd) do update set rate = excluded.rate
      `;
      matchedSpots.add(contentId);
      rows += 1;
    }
  }

  // 오늘 이전의 낡은 예측 제거
  await sql`delete from spot_congestion where base_ymd < current_date`;

  const titles = await sql`
    select title from night_spots where content_id = any(${[...matchedSpots]})
  `;
  console.log(`매칭된 스팟 ${matchedSpots.size}곳 (${rows}행): ${titles.map((t) => t.title).join(", ")}`);
} finally {
  await sql.end();
}
