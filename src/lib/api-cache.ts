import { sql } from "./db";

/**
 * 외부 API 응답의 마지막 성공분 보관.
 *
 * 실시간 호출이 먼저고, 이건 그 호출이 실패했을 때(한도 초과·타임아웃·장애)만
 * 꺼내 쓴다. 원천을 대체하는 적재가 아니라 "마지막으로 받은 응답"을 붙들어 두는
 * 응답 캐시다. 한도가 하루 종일 막혀도 어제 데이터로 정상 화면이 나온다.
 *
 * DB가 없거나(키 없는 CI 빌드) 쓰기가 실패해도 호출부는 영향받지 않는다.
 */
/** DB 설정이 없으면(키 없는 CI 빌드) 접속 대기 없이 바로 건너뛴다 — 30초씩 기다리다 빌드가 죽었다 */
const hasDb = () => !!process.env.DATABASE_URL;

export async function readApiCache<T>(key: string): Promise<T | null> {
  if (!hasDb()) return null;
  try {
    const rows = await sql<{ payload: T }[]>`
      select payload from api_cache where cache_key = ${key}
    `;
    return rows[0]?.payload ?? null;
  } catch {
    return null;
  }
}

export function writeApiCache(key: string, payload: unknown): void {
  if (!hasDb()) return;
  void sql`
    insert into api_cache (cache_key, payload, fetched_at)
    values (${key}, ${sql.json(payload as never)}, now())
    on conflict (cache_key) do update
      set payload = excluded.payload, fetched_at = now()
  `.catch(() => {});
}
