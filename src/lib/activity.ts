import { sql } from "./db";

/** 관리자 페이지에서 구분하는 활동 종류 */
export type ActivityAction =
  | "ai_course"
  | "etiquette"
  | "phrases"
  | "phrase_search"
  | "community_post"
  | "community_comment"
  | "community_report"
  | "spot_view";

/**
 * 사용자 활동 한 건 기록 — 관리자 페이지의 이용 흐름 파악용.
 * 로그는 부가 기능이므로 실패해도 원래 요청을 막지 않는다 (await하지 않고 흘려보냄).
 */
export function logActivity(
  userId: number | null,
  action: ActivityAction,
  detail: Record<string, unknown> = {},
): void {
  sql`
    insert into activity_log (user_id, action, detail)
    values (${userId}, ${action}, ${sql.json(detail as never)})
  `.catch((err) => {
    console.warn(
      "[activity] 기록 실패:",
      err instanceof Error ? err.message : err,
    );
  });
}

/** 이 사용자가 관리자인가 — 코스 생성 한도 예외, /admin 접근 판별 */
export async function isAdmin(userId: number): Promise<boolean> {
  try {
    const rows = await sql<{ role: string }[]>`
      select role from users where id = ${userId}
    `;
    return rows[0]?.role === "admin";
  } catch {
    return false; // 조회 실패 시 일반 사용자로 취급 (안전한 쪽으로)
  }
}
