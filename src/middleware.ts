import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE, verifySession } from "./lib/session-core";

const intlMiddleware = createMiddleware(routing);

// 로그인이 있어야만 뜻이 통하는 경로(로케일 접두사 제거 후 기준). 그 외는 전부 공개.
//
// 전에는 홈·로그인·가입만 공개하고 나머지를 다 막았는데, 심사위원이든 처음 온
// 사람이든 아무 메뉴나 눌렀는데 로그인부터 요구받는 건 서비스를 보기도 전에
// 문을 닫는 셈이었다. 명소·맛집·축제·K-Life·성향 테스트·타슈는 계정 데이터를
// 쓰지 않으니 연다. 커뮤니티는 읽기는 공개, 글쓰기만 API 가 401 로 막는다.
//
// 네컷 사진은 고른 장소·도장 사진이 계정에 남아 로그인 없이는 시작할 수 없고,
// AI 코스는 생성 한도(하루 5회)가 계정 기준이라 로그인 없이는 만들 수 없다.
// 찜 모아보기·프로필·관리자는 계정 그 자체다 — 이 다섯만 잠근다.
const PROTECTED_PATHS = ["/stamp-tour", "/courses", "/saved", "/profile", "/admin"];

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
  const isProtected = PROTECTED_PATHS.some(
    (p) => rest === p || rest.startsWith(p + "/"),
  );

  // 로케일이 아직 없는 요청은 next-intl이 감지·부착하도록 먼저 넘긴다.
  // (그 리다이렉트 후 재요청 때 로케일 포함 경로로 게이팅되어 감지 언어가 보존됨)
  if (locale && isProtected) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = await verifySession(token);
    if (!session) {
      // 어디서 왔는지 넘긴다 — 로그인 화면이 "로그인 후 이용해 주세요" 안내를 띄우고,
      // 로그인이 끝나면 홈이 아니라 원래 가려던 화면으로 돌려보낸다
      const login = new URL(`/${locale}/login`, request.url);
      login.searchParams.set("next", rest + request.nextUrl.search);
      return NextResponse.redirect(login);
    }
  }

  // 인증 통과(또는 공개 경로) → next-intl이 로케일 라우팅 처리
  return intlMiddleware(request);
}

export const config = {
  // API 라우트, Next 내부 경로, 정적 파일 제외
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
