import { NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/session";
import { issueVerification } from "@/lib/verification";

/** 인증 메일 재발송 — 로그인 필요. 간격·일일 상한은 issueVerification이 건다 */
export async function POST() {
  const session = await getActiveSessionUser();
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const result = await issueVerification(session.userId);
  if (result.ok) return NextResponse.json({ ok: true });

  const status =
    result.reason === "rate_limited"
      ? 429
      : result.reason === "not_configured"
        ? 503
        : 502;
  return NextResponse.json({ error: result.reason }, { status });
}
