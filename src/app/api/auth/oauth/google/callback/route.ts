import { NextRequest, NextResponse } from "next/server";
import {
  fetchGoogleProfile,
  googleOAuthEnabled,
  STATE_COOKIE,
  LOCALE_COOKIE,
} from "@/lib/oauth";
import {
  bumpSessionVersion,
  findOrCreateGoogleUser,
  markVerified,
} from "@/lib/users";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { routing } from "@/i18n/routing";

/** 구글 콜백 — state 검증 → 프로필 조회 → 계정 upsert → 세션 발급 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const origin = url.origin;

  const localeCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = routing.locales.includes(localeCookie as never)
    ? localeCookie!
    : routing.defaultLocale;

  // 실패 시 로그인 페이지로 (에러 표시), 단기 쿠키 정리
  const fail = () => {
    const res = NextResponse.redirect(
      new URL(`/${locale}/login?error=oauth`, origin),
    );
    res.cookies.delete(STATE_COOKIE);
    res.cookies.delete(LOCALE_COOKIE);
    return res;
  };

  if (!googleOAuthEnabled()) return fail();

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !savedState || state !== savedState) return fail();

  const redirectUri = `${origin}/api/auth/oauth/google/callback`;
  try {
    const profile = await fetchGoogleProfile(code, redirectUri);
    if (!profile || !profile.emailVerified) return fail();

    const { user, isNew } = await findOrCreateGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
    });
    // 위에서 profile.emailVerified를 확인하고 들어왔다 — 구글이 이미 주소 소유를
    // 검증했으므로 같은 걸 우리가 또 묻지 않는다
    await markVerified(user.id);
    const sessionVersion = await bumpSessionVersion(user.id);
    const token = await signSession({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
      sessionVersion,
    });
    // 신규 가입자는 프로필로 보내 국가 입력을 유도(?welcome=1). 기존 유저는 홈으로.
    const dest = isNew ? `/${locale}/profile?welcome=1` : `/${locale}`;
    const res = NextResponse.redirect(new URL(dest, origin));
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    res.cookies.delete(STATE_COOKIE);
    res.cookies.delete(LOCALE_COOKIE);
    return res;
  } catch (err) {
    console.error(
      "[auth] Google OAuth 콜백 실패:",
      err instanceof Error ? err.message : err,
    );
    return fail();
  }
}
