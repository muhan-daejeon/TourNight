// 응답 보관소(api_cache)에 국문 명소 목록을 심는다.
// 사용법: node --env-file=.env.local db/seed-api-cache.mjs <백업 night_spots.json>
//
// 한도가 막혀 실시간 호출이 하나도 성공하지 못한 날, 예전에 받아 둔 응답으로
// 보관소를 채워 화면을 살린다. 다음에 실시간이 성공하면 자동으로 덮어쓴다.
import postgres from "postgres";
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) { console.error("백업 json 경로를 주세요"); process.exit(1); }
const rows = JSON.parse(readFileSync(file, "utf8")).filter((r) => !String(r.content_id).startsWith("mock-"));

/** PostGIS EWKB(hex, little-endian, SRID 포함) → [x, y] */
function point(hex) {
  const b = Buffer.from(hex, "hex");
  return [b.readDoubleLE(9), b.readDoubleLE(17)];
}

const byType = new Map();
for (const r of rows) {
  const [x, y] = point(r.geom);
  const item = {
    contentid: r.content_id, title: r.title, addr1: r.addr ?? "",
    mapx: String(x), mapy: String(y), firstimage: r.image_url ?? "",
    contenttypeid: r.content_type_id, cat1: r.cat1 ?? "", cat3: r.cat3 ?? "",
  };
  byType.set(r.content_type_id, [...(byType.get(r.content_type_id) ?? []), item]);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
try {
  await sql`create table if not exists api_cache (cache_key text primary key, payload jsonb not null, fetched_at timestamptz not null default now())`;
  for (const [type, items] of byType) {
    // kto-live.fetchServiceRaw가 만드는 키와 같은 순서·값이어야 한다
    const key = `KorService2/areaBasedList2?${new URLSearchParams({ numOfRows: "100", pageNo: "1", areaCode: "3", contentTypeId: type })}`;
    await sql`insert into api_cache (cache_key, payload, fetched_at) values (${key}, ${sql.json(items)}, now())
              on conflict (cache_key) do update set payload = excluded.payload, fetched_at = now()`;
    console.log(`${key}: ${items.length}건`);
  }
} finally {
  await sql.end();
}
