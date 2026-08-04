import { NextRequest, NextResponse } from "next/server";
import {
  getSessionUser,
  signSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";
import { getUserById, updateProfile, NICKNAME_MAX } from "@/lib/users";
import { isValidCountry } from "@/lib/countries";

/** 현재 로그인 사용자 (없으면 user: null). 국가·닉네임은 DB 최신값 */
export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  try {
    const user = await getUserById(session.userId);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}

/** 프로필(닉네임·국가) 수정 — 로그인 필요. 닉네임 변경은 세션에도 반영 */
export async function PATCH(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  let payload: { nickname?: unknown; country?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const nickname =
    typeof payload.nickname === "string" ? payload.nickname.trim() : "";
  const country =
    typeof payload.country === "string" && payload.country
      ? payload.country
      : null;

  if (!nickname || nickname.length > NICKNAME_MAX) {
    return NextResponse.json({ error: "invalid_nickname" }, { status: 400 });
  }
  if (country && !isValidCountry(country)) {
    return NextResponse.json({ error: "invalid_country" }, { status: 400 });
  }

  try {
    const user = await updateProfile(session.userId, { nickname, country });
    if (!user) {
      return NextResponse.json({ error: "invalid_nickname" }, { status: 400 });
    }
    // 닉네임이 세션 payload에 있으므로 재발급 (이후 커뮤니티 작성자에 반영)
    const token = await signSession({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
    });
    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (err) {
    console.error(
      "[auth] 프로필 수정 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "server_error" }, { status: 502 });
  }
}
