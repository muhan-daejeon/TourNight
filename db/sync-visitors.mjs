// 대전 구별 일별 방문자 수 수집 (KTO 빅데이터_지역별 방문자수 GW)
// 집계가 수일~수주 지연되므로, 어제부터 거꾸로 최근 "가용" 날짜를 찾아 7일치를 저장한다.
// 사용법: npm run db:visitors  (주 1회 재실행 권장)
import postgres from "postgres";

const BASE = "https://apis.data.go.kr/B551011/DataLabService/locgoRegnVisitrDDList";
const DAEJEON_PREFIX = "30"; // 대전 시군구 코드 접두

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ymd(d) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function fetchDay(dateYmd) {
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
      startYmd: dateYmd,
      endYmd: dateYmd,
    });
    const res = await fetch(`${BASE}?${params}`);
    if (!res.ok) throw new Error(`방문자수 API ${res.status}`);
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
  // 최근 가용 날짜 탐색 (어제부터 최대 45일 역방향)
  let cursor = new Date(Date.now() - 24 * 3600 * 1000);
  let latest = null;
  for (let i = 0; i < 45; i += 1) {
    const items = await fetchDay(ymd(cursor));
    if (items.length > 0) {
      latest = new Date(cursor);
      break;
    }
    cursor = new Date(cursor.getTime() - 24 * 3600 * 1000);
    await sleep(150);
  }
  if (!latest) throw new Error("가용한 방문자 데이터를 찾지 못함 (45일 내 없음)");
  console.log(`최근 가용일: ${ymd(latest)}`);

  let saved = 0;
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(latest.getTime() - i * 24 * 3600 * 1000);
    const items = await fetchDay(ymd(day));
    for (const it of items) {
      if (!String(it.signguCode).startsWith(DAEJEON_PREFIX)) continue;
      const d = `${ymd(day).slice(0, 4)}-${ymd(day).slice(4, 6)}-${ymd(day).slice(6, 8)}`;
      await sql`
        insert into area_visitors (signgu_cd, base_ymd, tou_div, num)
        values (${it.signguCode}, ${d}, ${it.touDivCd}, ${Number(it.touNum)})
        on conflict (signgu_cd, base_ymd, tou_div) do update set num = excluded.num
      `;
      saved += 1;
    }
    console.log(`${ymd(day)} 저장 (대전 구 데이터)`);
  }
  console.log(`완료 — ${saved}행`);
} finally {
  await sql.end();
}
