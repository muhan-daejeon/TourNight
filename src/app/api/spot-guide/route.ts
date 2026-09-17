import { NextRequest, NextResponse } from "next/server";
import { generateSpotGuide } from "@/lib/gemini";
import { getKtoOverview } from "@/lib/kto-live";
import { getSpot } from "@/lib/spots";
import { sql } from "@/lib/db";
import { routing } from "@/i18n/routing";
import { getSessionUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

/**
 * 스팟 가이드: 소개문은 KTO 다국어 서비스의 공식 번역을 우선 사용하고,
 * 없으면 Gemini 생성으로 폴백. 야간 팁 3개는 항상 Gemini 생성(DB 캐시).
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

  // KTO 공식 소개문 — 저장분이 아니라 언어별 서비스에서 요청 시점에 받는다
  const official = (await getKtoOverview(contentId, locale)).trim();

  const cached = await sql<{ intro: string; tips: string[] }[]>`
    select intro, tips from spot_guide
    where content_id = ${contentId} and locale = ${locale}
  `;
  if (cached.length > 0) {
    return NextResponse.json({
      intro: official || cached[0].intro,
      tips: cached[0].tips,
      source: official ? "kto" : "ai",
    });
  }

  const spot = await getSpot(contentId, locale);
  if (!spot) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    // 팁 생성 컨텍스트: 공식 번역 > 국문 개요 순으로 제공
    const context = official || (await getKtoOverview(contentId, "ko"));
    const guide = await generateSpotGuide(spot, context, locale);
    await sql`
      insert into spot_guide (content_id, locale, intro, tips)
      values (${contentId}, ${locale}, ${guide.intro}, ${sql.json(guide.tips)})
      on conflict (content_id, locale)
      do update set intro = excluded.intro, tips = excluded.tips, updated_at = now()
    `;
    return NextResponse.json({
      intro: official || guide.intro,
      tips: guide.tips,
      source: official ? "kto" : "ai",
    });
  } catch (err) {
    // Gemini가 막혀도(429 등) 공식 소개문은 이미 받아 뒀으면 그거라도 보여준다.
    // 처음 보는 곳(축제 등, 캐시가 없는 곳)일수록 이 문제가 먼저 드러난다 —
    // 팁 3개는 못 만들어도 소개문 하나는 있는 편이 완전히 비는 것보다 낫다
    console.warn(
      "[spot-guide] AI 팁 생성 실패 — 공식 소개문만 반환합니다:",
      err instanceof Error ? err.message : err,
    );
    if (official) {
      return NextResponse.json({ intro: official, tips: [], source: "kto" });
    }
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
