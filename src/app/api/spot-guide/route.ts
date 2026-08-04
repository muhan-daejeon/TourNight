import { NextRequest, NextResponse } from "next/server";
import { generateSpotGuide } from "@/lib/gemini";
import { fetchOverviewKo } from "@/lib/kto";
import { getSpot } from "@/lib/spots";
import { sql } from "@/lib/db";
import { routing } from "@/i18n/routing";

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

  // KTO 공식 소개문 (sync-i18n으로 수집된 번역)
  const tr = await sql<{ overview: string | null }[]>`
    select overview from spot_translations
    where content_id = ${contentId} and locale = ${locale}
  `;
  const official = tr[0]?.overview?.trim() || "";

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
    const context = official || (await fetchOverviewKo(contentId));
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
  } catch {
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
