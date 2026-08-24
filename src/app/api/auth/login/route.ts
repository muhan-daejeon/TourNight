import { NextRequest, NextResponse } from "next/server";
import {
  bumpSessionVersion,
  findUserByEmail,
  verifyPassword,
} from "@/lib/users";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export async function POST(request: NextRequest) {
  let payload: { email?: unknown; password?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 400 });
  }

  try {
    const found = await findUserByEmail(email);
    // 존재 여부와 무관하게 동일 응답 — 계정 존재 노출 방지
    const ok = found ? await verifyPassword(password, found.password_hash) : false;
    if (!found || !ok) {
      return NextResponse.json(
        { error: "invalid_credentials" },
        { status: 401 },
      );
    }

    const user = {
      id: Number(found.id),
      email: found.email,
      nickname: found.nickname,
      country: found.country,
    };
    // 새 세대를 발급해 이전 기기의 세션을 무효화한다 (계정 돌려쓰기 방지)
    const sessionVersion = await bumpSessionVersion(user.id);
    const token = await signSession({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
      sessionVersion,
    });
    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (err) {
    console.error(
      "[auth] 로그인 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "server_error" }, { status: 502 });
  }
}
