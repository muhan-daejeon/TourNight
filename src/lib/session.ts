import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionUser } from "./session-core";
import { isSessionCurrent } from "./users";

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

/**
 * 지금도 유효한 세션인지까지 확인해서 돌려준다.
 *
 * getSessionUser는 JWT 서명만 본다(빠르고 DB를 안 탄다). 여기에 더해 세션 세대를
 * DB와 대조해, 그 뒤 다른 기기에서 로그인했다면 null을 준다.
 *
 * 매 요청마다 쓰면 읽기 경로에도 DB 조회가 붙으므로, 글쓰기처럼 계정을 실제로
 * 소모하는 동작과 로그인 상태 표시(/api/auth/me)에만 쓴다.
 */
export async function getActiveSessionUser(): Promise<SessionUser | null> {
  const session = await getSessionUser();
  if (!session) return null;
  const ok = await isSessionCurrent(session.userId, session.sessionVersion ?? 0);
  return ok ? session : null;
}
