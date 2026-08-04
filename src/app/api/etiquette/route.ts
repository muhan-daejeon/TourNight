import { NextRequest, NextResponse } from "next/server";
import { generateEtiquette, ETIQUETTE_TOPICS } from "@/lib/gemini";
import { sql } from "@/lib/db";
import { routing } from "@/i18n/routing";

export async function GET(request: NextRequest) {
  const topicId = request.nextUrl.searchParams.get("topic") ?? "";
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";

  if (!(topicId in ETIQUETTE_TOPICS) || !routing.locales.includes(locale as never)) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  // 사전생성 DB 캐시 우선 (심사/데모 안정성)
  const cached = await sql<{ content: string }[]>`
    select content from etiquette_cache
    where topic_id = ${topicId} and locale = ${locale}
  `;
  if (cached.length > 0) {
    return NextResponse.json({ text: cached[0].content });
  }

  try {
    const text = await generateEtiquette(topicId, locale);
    await sql`
      insert into etiquette_cache (topic_id, locale, content)
      values (${topicId}, ${locale}, ${text})
      on conflict (topic_id, locale)
      do update set content = excluded.content, updated_at = now()
    `;
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
