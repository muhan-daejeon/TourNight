import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isEmailVerified } from "@/lib/users";
import { getQuotaStatus } from "@/lib/community-limits";

/** 세션마다 값이 다르다 — 캐시되면 남의 사용량이 보인다 */
const NO_STORE = { "Cache-Control": "no-store" };

/** 오늘 남은 작성 횟수 — 작성 폼에 표시하기 위한 조회 */
export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json(
      { error: "login_required" },
      { status: 401, headers: NO_STORE },
    );
  }
  const verified = await isEmailVerified(session.userId);
  const quota = await getQuotaStatus(session.userId, verified);
  return NextResponse.json(quota, { headers: NO_STORE });
}
