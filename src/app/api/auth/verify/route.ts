import { NextRequest, NextResponse } from "next/server";
import { consumeVerification } from "@/lib/verification";
import { routing } from "@/i18n/routing";

/** next-intl이 감지한 언어를 담아 두는 쿠키 — 메일에서 들어와도 같은 언어로 돌려보낸다 */
const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * 메일 링크 착지점 — 토큰을 확인하고 커뮤니티로 돌려보낸다.
 *
 * 결과를 쿼리로 넘겨 화면에서 안내한다. 로그인 여부와 무관하게 처리하는 게 맞다.
 * 토큰 자체가 "이 주소의 주인이다"라는 증거이고, 메일을 다른 기기에서 여는 일이 흔하다.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = routing.locales.includes(cookieLocale as never)
    ? cookieLocale!
    : routing.defaultLocale;

  const result = await consumeVerification(token);

  const dest = new URL(`/${locale}/community`, request.nextUrl.origin);
  dest.searchParams.set("verified", result);
  return NextResponse.redirect(dest);
}
