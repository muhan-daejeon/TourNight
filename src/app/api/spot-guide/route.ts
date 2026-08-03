import { NextRequest, NextResponse } from "next/server";
import { generateSpotGuide } from "@/lib/gemini";
import { fetchOverviewKo } from "@/lib/kto";
import { getSpot } from "@/lib/spots";
import { sql } from "@/lib/db";
import { routing } from "@/i18n/routing";

export async function GET(request: NextRequest) {
  const contentId = request.nextUrl.searchParams.get("contentId") ?? "";
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";

  if (!contentId || !routing.locales.includes(locale as never)) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const cached = await sql<{ intro: string; tips: string[] }[]>`
    select intro, tips from spot_guide
    where content_id = ${contentId} and locale = ${locale}
  `;
  if (cached.length > 0) {
    return NextResponse.json(cached[0]);
  }

  const spot = await getSpot(contentId);
  if (!spot) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const overviewKo = await fetchOverviewKo(contentId);
    const guide = await generateSpotGuide(spot, overviewKo, locale);
    await sql`
      insert into spot_guide (content_id, locale, intro, tips)
      values (${contentId}, ${locale}, ${guide.intro}, ${sql.json(guide.tips)})
      on conflict (content_id, locale)
      do update set intro = excluded.intro, tips = excluded.tips, updated_at = now()
    `;
    return NextResponse.json(guide);
  } catch {
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
