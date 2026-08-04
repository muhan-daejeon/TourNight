import "server-only";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo";

// CSRF 방지 state·복귀 locale을 담는 단기 쿠키
export const STATE_COOKIE = "g_oauth_state";
export const LOCALE_COOKIE = "g_oauth_locale";

/** GOOGLE_CLIENT_ID/SECRET가 모두 있어야 OAuth 활성 (없으면 버튼 숨김) */
export function googleOAuthEnabled(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });
  return `${GOOGLE_AUTH}?${params}`;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

/** code → 토큰 교환 → userinfo 조회. 실패 시 null */
export async function fetchGoogleProfile(
  code: string,
  redirectUri: string,
): Promise<GoogleProfile | null> {
  const tokenRes = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return null;
  const token = await tokenRes.json();
  if (!token.access_token) return null;

  const uiRes = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!uiRes.ok) return null;
  const info = await uiRes.json();
  if (!info.sub || !info.email) return null;

  return {
    sub: String(info.sub),
    email: String(info.email),
    emailVerified: info.email_verified === true || info.email_verified === "true",
    name: info.name || info.given_name || "",
  };
}
