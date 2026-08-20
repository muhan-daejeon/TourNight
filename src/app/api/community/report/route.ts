import { NextRequest, NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/session";
import {
  reportContent,
  REPORT_REASONS,
  type ReportReason,
  type ReportTarget,
} from "@/lib/community";
import { logActivity } from "@/lib/activity";

/**
 * 글·댓글 신고 — 로그인 필요.
 *
 * 대상 종류가 둘이라 /community/[postId] 아래로 넣지 않고 단일 경로로 받는다.
 * 사유는 정해진 값만 받는다 — 자유 입력을 열면 욕설·개인정보가 그대로 저장된다.
 */
export async function POST(request: NextRequest) {
  const session = await getActiveSessionUser();
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  let payload: { targetType?: unknown; targetId?: unknown; reason?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const targetType = payload.targetType;
  const targetId = Number(payload.targetId);
  const reason = payload.reason;

  if (targetType !== "post" && targetType !== "comment") {
    return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  }
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  }
  if (!REPORT_REASONS.includes(reason as ReportReason)) {
    return NextResponse.json({ error: "invalid_reason" }, { status: 400 });
  }

  try {
    const result = await reportContent({
      targetType: targetType as ReportTarget,
      targetId,
      reporterId: session.userId,
      reason: reason as ReportReason,
    });
    if (result === "not-found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    // 중복도 성공으로 돌려준다 — 이미 신고했다는 사실을 알려줄 뿐,
    // 사용자 입장에서 할 일은 끝났다
    if (result === "ok") {
      logActivity(session.userId, "community_report", { targetType, targetId });
    }
    return NextResponse.json({ ok: true, duplicate: result === "duplicate" });
  } catch (err) {
    console.error(
      "[community] 신고 처리 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "server_error" }, { status: 502 });
  }
}
