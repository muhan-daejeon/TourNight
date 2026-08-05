// 세션 JWT의 서명·검증 코어. next/headers·server-only에 의존하지 않아
// 엣지 미들웨어에서도 그대로 쓸 수 있다. 쿠키 읽기(getSessionUser)는 session.ts에.
import { SignJWT, jwtVerify } from "jose";

// 세션은 jose(HS256)로 서명한 JWT를 HttpOnly 쿠키에 담는다.
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);

export const SESSION_COOKIE = "tn_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7일

export interface SessionUser {
  userId: number;
  email: string;
  nickname: string;
}

/** 쿠키 옵션 — 개발(http)에서는 secure=false여야 쿠키가 저장됨 */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SEC,
};

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.userId !== "number" ||
      typeof payload.email !== "string" ||
      typeof payload.nickname !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      nickname: payload.nickname,
    };
  } catch {
    return null; // 만료·위조 등
  }
}
