import postgres from "postgres";

// 서버리스 환경에서 연결 재사용을 위한 싱글턴
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false, // Transaction pooler(pgbouncer) 호환
    max: 5,
  });

globalForDb.sql = sql;
