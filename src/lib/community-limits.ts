import { sql } from "./db";

/**
 * 커뮤니티 일일 작성 한도.
 *
 * 메일 인증은 신원 확인이 아니다 — "이 주소로 메일을 받을 수 있다"만 증명한다.
 * 그래서 인증을 통과 조건으로 쓰지 않고, 계정을 만드는 데 든 품만큼 한도를
 * 넉넉히 주는 방식으로 쓴다. 인증 메일이 끝내 도착하지 않는 이용자도(일본 캐리어
 * 메일·중국 QQ에서 흔하다) 서비스에서 튕겨나가지 않는 게 이 설계의 핵심이다.
 */
export const LIMITS = {
  post: { unverified: 3, verified: 5 },
  comment: { unverified: 5, verified: 10 },
} as const;

export type ContentKind = keyof typeof LIMITS;

export function limitFor(kind: ContentKind, verified: boolean): number {
  return verified ? LIMITS[kind].verified : LIMITS[kind].unverified;
}

export interface QuotaResult {
  ok: boolean;
  limit: number;
  /** 이번 요청까지 포함한 오늘 사용량 */
  used: number;
}

/**
 * 한도를 하나 쓴다. 넘겼으면 ok:false.
 *
 * 읽고 나서 쓰면 동시 요청에 한도가 새므로, 증가와 확인을 한 문장으로 한다
 * (ai_course_usage와 같은 방식).
 */
export async function consumeQuota(
  userId: number,
  kind: ContentKind,
  verified: boolean,
): Promise<QuotaResult> {
  const limit = limitFor(kind, verified);
  try {
    const [{ count }] = await sql<{ count: number }[]>`
      insert into community_usage (user_id, kind, used_on, count)
      values (${userId}, ${kind}, current_date, 1)
      on conflict (user_id, kind, used_on)
      do update set count = community_usage.count + 1
      returning count
    `;
    return { ok: count <= limit, limit, used: count };
  } catch (err) {
    // 기록이 실패했다고 글을 막지는 않는다 — 한도는 최선 노력이고,
    // DB 일시 장애로 정상 이용자가 갇히는 쪽이 더 나쁘다
    console.warn(
      "[community] 사용량 기록 실패:",
      err instanceof Error ? err.message : err,
    );
    return { ok: true, limit, used: 0 };
  }
}

/** 한도를 되돌린다 — 기록만 남기고 실제 저장에 실패했을 때 */
export async function refundQuota(
  userId: number,
  kind: ContentKind,
): Promise<void> {
  try {
    await sql`
      update community_usage set count = greatest(count - 1, 0)
      where user_id = ${userId} and kind = ${kind} and used_on = current_date
    `;
  } catch {
    // 되돌리기 실패는 사용자에게 영향이 없다 (다음날 0으로 돌아간다)
  }
}
