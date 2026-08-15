import { NextResponse } from "next/server";
import { isEmailVerified } from "./users";
import { screenText } from "./gemini";
import {
  consumeQuota,
  refundQuota,
  type ContentKind,
} from "./community-limits";

/**
 * 글·댓글 작성 공통 관문 — 한도 확인과 본문 검수를 한 곳에서 한다.
 *
 * 순서가 중요하다. 한도를 먼저 쓰고 검수를 나중에 하면, 검수에서 걸린 요청이
 * 한도를 갉아먹는다. 그렇다고 검수를 먼저 하면 한도를 넘긴 사람의 요청으로도
 * Gemini를 호출하게 된다. 한도를 먼저 잡되 검수에서 막히면 되돌리는 쪽을 택했다.
 */
export type GuardResult =
  | { ok: true; verified: boolean }
  | { ok: false; response: NextResponse };

/**
 * 검수기 없이도 알아볼 수 있는 스팸 신호.
 *
 * Gemini 무료 한도(429)에 걸리면 검수가 통째로 건너뛰어진다. 그때 광고 링크나
 * 남의 전화번호까지 그대로 올라가면 곤란하므로, 최소한 이 둘은 API 없이 잡는다.
 * 판단이 아니라 신호 탐지라 자체로 차단하지는 않는다 — 검수기가 살아 있으면
 * 그쪽 판단을 따르고, 죽었을 때만 이 신호를 근거로 막는다.
 */
function hasRiskySignal(body: string): boolean {
  // 링크 (http/www, 그리고 흔한 TLD를 쓴 맨 도메인)
  if (/(https?:\/\/|www\.)/i.test(body)) return true;
  if (/\b[a-z0-9][a-z0-9-]*\.(com|net|org|kr|io|co|me|xyz|top|shop|link)\b/i.test(body)) {
    return true;
  }
  // 휴대전화 번호
  if (/\b01[016789][-. ]?\d{3,4}[-. ]?\d{4}\b/.test(body)) return true;
  return false;
}

export async function guardCommunityWrite(
  userId: number,
  kind: ContentKind,
  body: string,
): Promise<GuardResult> {
  const verified = await isEmailVerified(userId);

  const quota = await consumeQuota(userId, kind, verified);
  if (!quota.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "daily_limit", limit: quota.limit, verified },
        { status: 429 },
      ),
    };
  }

  try {
    const verdict = await screenText(body);
    if (!verdict.allowed) {
      await refundQuota(userId, kind);
      console.warn(`[community] 본문 차단(${kind}):`, verdict.reason);
      return {
        ok: false,
        response: NextResponse.json({ error: "text_rejected" }, { status: 422 }),
      };
    }
  } catch (err) {
    // 검수기가 죽었다고 정상 글까지 막지는 않는다(사진 검수와 같은 방침).
    // 다만 링크·전화번호처럼 눈에 띄는 신호가 있으면 그때는 막는다 —
    // 무료 한도로 검수가 꺼진 틈이 그대로 스팸 통로가 되면 안 된다.
    const risky = hasRiskySignal(body);
    console.warn(
      `[community] 본문 검수 실패 — ${risky ? "위험 신호가 있어 차단" : "통과"}합니다:`,
      err instanceof Error ? err.message : err,
    );
    if (risky) {
      await refundQuota(userId, kind);
      return {
        ok: false,
        response: NextResponse.json({ error: "text_rejected" }, { status: 422 }),
      };
    }
  }

  return { ok: true, verified };
}
