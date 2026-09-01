import { NextRequest, NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { PERSONALITY_TYPES, type PersonalityType } from "@/lib/personality-test";

/**
 * 성향 테스트 결과 저장.
 *
 * 결과 화면에 도달할 때마다(재시작 포함) 한 건씩 남긴다 — 새 표가 아니라
 * activity_log(action='personality_test')를 그대로 쓴다. 이 서비스에서
 * "그 사람의 최신 상태"는 전부 "가장 최근 로그 한 줄"로 충분해(course_survey도
 * 같은 방식) 굳이 표를 하나 더 늘리지 않는다. 프로필의 "내 여행 성향 확인하기"는
 * 이 중 가장 최근 것만 읽는다(/api/personality/latest).
 */

function isType(v: unknown): v is PersonalityType {
  return typeof v === "string" && (PERSONALITY_TYPES as readonly string[]).includes(v);
}

export async function POST(request: NextRequest) {
  const session = await getActiveSessionUser();
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const primary = body.primary;
  const secondary = body.secondary ?? null;
  const scores = body.scores;

  if (!isType(primary) || (secondary !== null && !isType(secondary))) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }
  if (
    typeof scores !== "object" ||
    scores === null ||
    !PERSONALITY_TYPES.every(
      (t) => Number.isFinite((scores as Record<string, unknown>)[t]),
    )
  ) {
    return NextResponse.json({ error: "invalid scores" }, { status: 400 });
  }

  logActivity(session.userId, "personality_test", { primary, secondary, scores });
  return NextResponse.json({ ok: true });
}
