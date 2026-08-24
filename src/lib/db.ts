import postgres from "postgres";

// 서버리스 환경에서 연결 재사용을 위한 싱글턴
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false, // Transaction pooler(pgbouncer) 호환
    max: 5,
    // 놀고 있는 연결은 20초 뒤 반납한다.
    //
    // 기본값(null)은 연결을 안 닫는다 — max_lifetime(30~60분)이 돌 때까지 붙잡고
    // 있는다. 서버 max_connections가 60인데 next build는 워커 11개를 띄우고
    // 워커마다 자기 풀을 가져서, 그대로 두면 11 × 5 = 55로 한도에 거의 닿는다.
    idle_timeout: 20, // 초
    // DB 미도달 시 무한 대기 방지 — 없으면 빌드(SSG의 DB 조회)가 연결 대기로 멈춰
    // Vercel 45분 빌드 한도까지 매달린다. 타임아웃 시 에러 → 호출부 폴백 발동.
    connect_timeout: 10, // 초
  });

globalForDb.sql = sql;
