import { createHash, randomBytes } from "node:crypto";
import { sql } from "./db";
import { appUrl, mailConfigured, sendMail, verificationMail } from "./mail";

/** 토큰 유효 기간 */
const TTL_HOURS = 24;

/** 재발송 간격 — 메일함이 도배되지 않게, 그리고 발송량을 아끼려고 둔다 */
const RESEND_COOLDOWN_SEC = 60;

/** 하루 발송 상한 (계정당) — 남의 주소로 가입해 메일 폭탄을 보내는 걸 막는다 */
const DAILY_SEND_LIMIT = 5;

/**
 * 원문 토큰은 메일에만 담고 DB에는 해시만 남긴다.
 * 토큰 자체가 인증 수단이라 비밀번호와 같은 취급을 해야 한다.
 */
function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type IssueResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "rate_limited" | "send_failed" };

/**
 * 인증 메일 발송. 이미 인증된 계정이면 아무것도 하지 않고 ok를 돌려준다
 * (인증 여부를 외부에서 떠보는 데 쓰이지 않도록 응답을 구분하지 않는다).
 */
export async function issueVerification(userId: number): Promise<IssueResult> {
  if (!mailConfigured()) return { ok: false, reason: "not_configured" };

  const rows = await sql<
    { email: string; nickname: string; email_verified_at: string | null }[]
  >`
    select email, nickname, email_verified_at from users where id = ${userId}
  `;
  const user = rows[0];
  if (!user || user.email_verified_at) return { ok: true };

  const [limits] = await sql<{ recent: string; today: string }[]>`
    select
      count(*) filter (where created_at > now() - make_interval(secs => ${RESEND_COOLDOWN_SEC})) as recent,
      count(*) filter (where created_at > now() - interval '1 day') as today
    from email_verifications
    where user_id = ${userId}
  `;
  if (Number(limits.recent) > 0 || Number(limits.today) >= DAILY_SEND_LIMIT) {
    return { ok: false, reason: "rate_limited" };
  }

  // 새 토큰을 내면 이전 토큰은 못 쓰게 한다 — 살아 있는 링크가 여러 개면
  // 오래된 메일이 유출됐을 때 그대로 쓸 수 있다
  await sql`
    update email_verifications set consumed_at = now()
    where user_id = ${userId} and consumed_at is null
  `;

  const token = randomBytes(32).toString("base64url");
  await sql`
    insert into email_verifications (token_hash, user_id, email, expires_at)
    values (${hash(token)}, ${userId}, ${user.email},
            now() + make_interval(hours => ${TTL_HOURS}))
  `;

  const link = `${appUrl()}/api/auth/verify?token=${encodeURIComponent(token)}`;
  const mail = verificationMail({ nickname: user.nickname, link });
  const sent = await sendMail({ to: user.email, ...mail });
  if (!sent.ok) {
    console.error("[auth] 인증 메일 발송 실패:", sent.error);
    return { ok: false, reason: "send_failed" };
  }
  return { ok: true };
}

export type VerifyResult = "ok" | "already" | "invalid" | "expired";

/**
 * 토큰 확인 후 계정을 인증 처리한다.
 *
 * 발송 시점 주소와 현재 주소가 다르면 거절한다. 지금은 주소를 바꿀 방법이 없지만,
 * 나중에 변경 기능이 생겼을 때 옛 링크로 새 주소가 인증되면 안 된다.
 */
export async function consumeVerification(
  token: string,
): Promise<VerifyResult> {
  if (!token) return "invalid";

  const rows = await sql<
    {
      user_id: string;
      email: string;
      expires_at: string;
      consumed_at: string | null;
      current_email: string;
      email_verified_at: string | null;
    }[]
  >`
    select v.user_id, v.email, v.expires_at, v.consumed_at,
           u.email as current_email, u.email_verified_at
    from email_verifications v
    join users u on u.id = v.user_id
    where v.token_hash = ${hash(token)}
  `;
  const row = rows[0];
  if (!row) return "invalid";
  if (row.email_verified_at) return "already";
  if (row.consumed_at) return "invalid";
  if (new Date(row.expires_at) <= new Date()) return "expired";
  if (row.email !== row.current_email) return "invalid";

  await sql`
    update users set email_verified_at = now()
    where id = ${row.user_id} and email_verified_at is null
  `;
  await sql`
    update email_verifications set consumed_at = now()
    where token_hash = ${hash(token)}
  `;
  return "ok";
}

// isEmailVerified·markVerified는 users.ts에 있다. 이 파일은 nodemailer를 끌고
// 들어오므로, 발송과 무관한 커뮤니티 API가 여기에 기대면 안 된다.
