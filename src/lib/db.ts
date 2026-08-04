import postgres from "postgres";

// 서버리스 환경에서 연결 재사용을 위한 싱글턴
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false, // Transaction pooler(pgbouncer) 호환
    max: 5,
    // DB 미도달 시 무한 대기 방지 — 없으면 빌드(SSG의 DB 조회)가 연결 대기로 멈춰
    // Vercel 45분 빌드 한도까지 매달린다. 타임아웃 시 에러 → 호출부 폴백 발동.
    connect_timeout: 10, // 초
  });

globalForDb.sql = sql;
