import { NextRequest, NextResponse } from "next/server";
import {
  fetchGoogleProfile,
  googleOAuthEnabled,
  STATE_COOKIE,
  LOCALE_COOKIE,
} from "@/lib/oauth";
import { findOrCreateGoogleUser } from "@/lib/users";
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

    const user = await findOrCreateGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
    });
    const token = await signSession({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
    });
    const res = NextResponse.redirect(new URL(`/${locale}`, origin));
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
