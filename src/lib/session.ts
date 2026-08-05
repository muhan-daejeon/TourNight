import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionUser } from "./session-core";

// 서명·검증·쿠키옵션은 엣지에서도 쓰는 session-core에 있고, 여기서 그대로 재export.
// (기존 `@/lib/session` import 호환 유지)
export {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifySession,
  type SessionUser,
} from "./session-core";

/** 현재 요청의 세션 사용자 (라우트 핸들러·서버 컴포넌트에서 읽기) */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}
