// DB 스키마 생성 + 시드 실행
// 사용법: npm run db:setup
import { readFileSync } from "node:fs";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

try {
  await sql.unsafe(readFileSync("db/schema.sql", "utf8"));
  console.log("스키마 적용 완료");
  await sql.unsafe(readFileSync("db/seed.sql", "utf8"));
  const [{ count }] = await sql`select count(*)::int as count from night_spots`;
  console.log(`시드 완료 — night_spots ${count}건`);
} finally {
  await sql.end();
}
