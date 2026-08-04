import { NextRequest, NextResponse } from "next/server";
import {
  createUser,
  EMAIL_MAX,
  NICKNAME_MAX,
  PASSWORD_MIN,
  PASSWORD_MAX,
} from "@/lib/users";
import { isValidCountry } from "@/lib/countries";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let payload: {
    email?: unknown;
    password?: unknown;
    nickname?: unknown;
    country?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const nickname =
    typeof payload.nickname === "string" ? payload.nickname.trim() : "";
  const country =
    typeof payload.country === "string" && payload.country
      ? payload.country
      : null;

  // 검증 — 필드별 에러 코드로 반환해 클라이언트가 문구를 현지화
  if (!EMAIL_RE.test(email) || email.length > EMAIL_MAX) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return NextResponse.json({ error: "invalid_password" }, { status: 400 });
  }
  if (!nickname || nickname.length > NICKNAME_MAX) {
    return NextResponse.json({ error: "invalid_nickname" }, { status: 400 });
  }
  if (country && !isValidCountry(country)) {
    return NextResponse.json({ error: "invalid_country" }, { status: 400 });
  }

  try {
    const user = await createUser({ email, password, nickname, country });
    const token = await signSession({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
    });
    const res = NextResponse.json({ user }, { status: 201 });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "23505"
    ) {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    console.error(
      "[auth] 회원가입 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "server_error" }, { status: 502 });
  }
}
