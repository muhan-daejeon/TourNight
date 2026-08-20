import { NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/session";
import { completeTour } from "@/lib/users";

/**
 * 둘러보기를 본 것으로 기록한다 (마지막 단계 완료·건너뛰기 모두).
 *
 * 다시 보기는 이 기록을 지우지 않는다 — 프로필에서 ?tour=start로 들어가면
 * 기록과 무관하게 열리므로, 지웠다 다시 쓰는 왕복이 필요 없다.
 */
export async function POST() {
  const session = await getActiveSessionUser();
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  try {
    await completeTour(session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // 기록 실패로 사용자를 붙잡아 두지는 않는다. 다음 접속에 한 번 더 뜰 뿐이다
    console.warn(
      "[tour] 완료 기록 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ ok: true });
  }
}
