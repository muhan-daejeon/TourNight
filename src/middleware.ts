import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE, verifySession } from "./lib/session-core";

const intlMiddleware = createMiddleware(routing);

// 로그인 없이 접근 가능한 경로(로케일 접두사 제거 후 기준). 그 외는 전부 로그인 필요.
const PUBLIC_PATHS = ["/login", "/signup"];

function stripLocale(pathname: string): { locale: string | null; rest: string } {
  const segments = pathname.split("/"); // "/ko/login" → ["", "ko", "login"]
  const maybeLocale = segments[1];
  if (routing.locales.includes(maybeLocale as (typeof routing.locales)[number])) {
    return { locale: maybeLocale, rest: "/" + segments.slice(2).join("/") };
  }
  return { locale: null, rest: pathname };
}

export default async function middleware(request: NextRequest) {
  const { locale, rest } = stripLocale(request.nextUrl.pathname);
  const isPublic = PUBLIC_PATHS.some(
    (p) => rest === p || rest.startsWith(p + "/"),
  );

  // 로케일이 아직 없는 요청은 next-intl이 감지·부착하도록 먼저 넘긴다.
  // (그 리다이렉트 후 재요청 때 로케일 포함 경로로 게이팅되어 감지 언어가 보존됨)
  if (locale && !isPublic) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = await verifySession(token);
    if (!session) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }

  // 인증 통과(또는 공개 경로) → next-intl이 로케일 라우팅 처리
  return intlMiddleware(request);
}

export const config = {
  // API 라우트, Next 내부 경로, 정적 파일 제외
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
