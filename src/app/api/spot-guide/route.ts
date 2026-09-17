import { NextRequest, NextResponse } from "next/server";
import { getKtoOverview } from "@/lib/kto-live";
import { getSpot } from "@/lib/spots";
import { routing } from "@/i18n/routing";
import { getSessionUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

/**
 * 스팟 가이드: 한국관광공사 공식 소개문을 그대로 가져온다.
 *
 * AI가 글을 새로 짓지 않는다 — 관광데이터 활용 공모전 취지에 맞게, 실제
 * 데이터를 "가져오는" 화면으로 둔다(예전엔 소개문이 없으면 Gemini가 야간
 * 팁 3개를 지어냈는데, 그 AI 생성 부분을 뺐다).
 */
export async function GET(request: NextRequest) {
  const contentId = request.nextUrl.searchParams.get("contentId") ?? "";
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";

  if (!contentId || !routing.locales.includes(locale as never)) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  logActivity((await getSessionUser())?.userId ?? null, "spot_view", {
    contentId,
    locale,
  });

  const spot = await getSpot(contentId, locale);
  if (!spot) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // 공식 소개문 — 저장분이 아니라 언어별 서비스에서 요청 시점에 받는다.
  // 없으면(공사가 이 언어로 소개문을 안 준 곳) 가이드 없음으로 처리한다.
  const official = (await getKtoOverview(contentId, locale)).trim();
  if (!official) {
    return NextResponse.json({ error: "no overview" }, { status: 404 });
  }
  return NextResponse.json({ intro: official });
}
