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
  /**
   * 발급 시점의 users.session_version.
   *
   * 로그인할 때마다 서버에서 1씩 올라가므로, 이 값이 현재 DB 값보다 낮으면
   * 그 뒤에 어딘가에서 다시 로그인했다는 뜻이다 = 이 토큰은 옛 기기의 것.
   * 이 파일은 엣지 미들웨어에서도 쓰이므로 여기서는 DB를 보지 않고 값만 실어 나른다.
   * 실제 대조는 session.ts의 getActiveSessionUser가 한다.
   *
   * 이 컬럼이 생기기 전에 발급된 토큰에는 값이 없어 0으로 본다 (기본값과 같아 통과).
   */
  sessionVersion?: number;
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
      sessionVersion:
        typeof payload.sessionVersion === "number" ? payload.sessionVersion : 0,
    };
  } catch {
    return null; // 만료·위조 등
  }
}
