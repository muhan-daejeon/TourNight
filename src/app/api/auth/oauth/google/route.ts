import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import {
  googleOAuthEnabled,
  googleAuthorizeUrl,
  STATE_COOKIE,
  LOCALE_COOKIE,
} from "@/lib/oauth";
import { routing } from "@/i18n/routing";

/** Google 로그인 시작 — state 쿠키 세팅 후 구글 동의 화면으로 리다이렉트 */
export async function GET(request: NextRequest) {
  if (!googleOAuthEnabled()) {
    return NextResponse.json({ error: "oauth_not_configured" }, { status: 404 });
  }

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/oauth/google/callback`;
  const state = randomBytes(16).toString("hex");

  const localeParam = request.nextUrl.searchParams.get("locale");
  const locale = routing.locales.includes(localeParam as never)
    ? localeParam!
    : routing.defaultLocale;

  const res = NextResponse.redirect(googleAuthorizeUrl(redirectUri, state));
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10분
  };
  res.cookies.set(STATE_COOKIE, state, opts);
  res.cookies.set(LOCALE_COOKIE, locale, opts);
  return res;
}
