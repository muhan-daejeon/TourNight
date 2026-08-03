// KTO TourAPI → night_spots 동기화 (1단계: 대전 전체 수집, night_verified=false로 적재)
// 사용법: npm run db:sync
// 공모전 유의: 원천 데이터 수정 없이 그대로 적재, 재실행 시 최신 데이터로 갱신(동기화)
import postgres from "postgres";

const BASE_URL = "https://apis.data.go.kr/B551011/KorService2";
const DAEJEON = "3";
// 12 관광지, 14 문화시설, 15 축제/공연/행사, 28 레포츠, 38 쇼핑
const CONTENT_TYPES = ["12", "14", "15", "28", "38"];

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

async function fetchPage(contentTypeId, pageNo) {
  const params = new URLSearchParams({
    serviceKey: process.env.KTO_API_KEY,
    MobileOS: "ETC",
    MobileApp: "TourNight",
    _type: "json",
    numOfRows: "100",
    pageNo: String(pageNo),
    arrange: "A",
    areaCode: DAEJEON,
    contentTypeId,
  });
  const res = await fetch(`${BASE_URL}/areaBasedList2?${params}`);
  if (!res.ok) throw new Error(`KTO ${res.status}`);
  const data = await res.json();
  const body = data?.response?.body;
  return { items: body?.items?.item ?? [], total: body?.totalCount ?? 0 };
}

// 카테고리 매핑: 축제 → festival, 자연(A01) → nature, 과학 관련 → science, 그 외 → city
function mapCategory(item) {
  if (item.contenttypeid === "15") return "festival";
  if (item.cat1 === "A01") return "nature";
  if (["A02060100", "A02060200", "A02060300"].includes(item.cat3)) return "science"; // 과학관·기념관·전시관
  return "city";
}

let upserted = 0;
try {
  for (const type of CONTENT_TYPES) {
    let page = 1;
    let total = Infinity;
    let got = 0;
    while (got < total) {
      const { items, total: t } = await fetchPage(type, page);
      total = t;
      if (items.length === 0) break;
      got += items.length;
      for (const it of items) {
        if (!it.mapx || !it.mapy || Number(it.mapx) === 0) continue; // 좌표 없는 데이터 제외
        await sql`
          insert into night_spots (content_id, title, addr, category, image_url, geom, content_type_id, cat1, cat3)
          values (
            ${it.contentid}, ${it.title}, ${it.addr1 || ""}, ${mapCategory(it)},
            ${it.firstimage || null},
            st_setsrid(st_makepoint(${Number(it.mapx)}, ${Number(it.mapy)}), 4326),
            ${it.contenttypeid}, ${it.cat1 || null}, ${it.cat3 || null}
          )
          on conflict (content_id) do update set
            title = excluded.title,
            addr = excluded.addr,
            category = excluded.category,
            image_url = excluded.image_url,
            geom = excluded.geom,
            content_type_id = excluded.content_type_id,
            cat1 = excluded.cat1,
            cat3 = excluded.cat3
        `;
        upserted += 1;
      }
      page += 1;
    }
    console.log(`contentType ${type}: 총 ${total}건 중 ${got}건 수신`);
  }
  const [{ count }] = await sql`select count(*)::int as count from night_spots`;
  console.log(`동기화 완료 — upsert ${upserted}건, night_spots 총 ${count}건`);
} finally {
  await sql.end();
}
