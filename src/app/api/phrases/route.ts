import { NextRequest, NextResponse } from "next/server";
import { generatePhrases } from "@/lib/gemini";
import { sql } from "@/lib/db";
import { routing } from "@/i18n/routing";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  if (!routing.locales.includes(locale as never) || locale === "ko") {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const cached = await sql<{ phrases: unknown }[]>`
    select phrases from phrase_cache where locale = ${locale}
  `;
  if (cached.length > 0) {
    return NextResponse.json({ phrases: cached[0].phrases });
  }

  try {
    const phrases = await generatePhrases(locale);
    await sql`
      insert into phrase_cache (locale, phrases)
      values (${locale}, ${sql.json(phrases)})
      on conflict (locale)
      do update set phrases = excluded.phrases, updated_at = now()
    `;
    return NextResponse.json({ phrases });
  } catch {
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
