import { NextRequest, NextResponse } from "next/server";
import {
  generatePhraseCategory,
  PHRASE_CATEGORIES,
  type Phrase,
} from "@/lib/gemini";
import { sql } from "@/lib/db";
import { routing } from "@/i18n/routing";

/** 상황별 표현집 전체 반환 — 캐시 우선, 없는 카테고리만 생성 */
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  if (!routing.locales.includes(locale as never) || locale === "ko") {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const cached = await sql<{ category: string; phrases: Phrase[] }[]>`
    select category, phrases from phrase_book where locale = ${locale}
  `;
  const book: Record<string, Phrase[]> = {};
  for (const row of cached) book[row.category] = row.phrases;

  // 미생성 카테고리는 그 자리에서 생성해 캐시 (사전생성이 정상이라면 발동 안 함)
  for (const categoryId of Object.keys(PHRASE_CATEGORIES)) {
    if (book[categoryId]) continue;
    try {
      const phrases = await generatePhraseCategory(categoryId, locale);
      await sql`
        insert into phrase_book (locale, category, phrases)
        values (${locale}, ${categoryId}, ${sql.json(phrases as unknown as Parameters<typeof sql.json>[0])})
        on conflict (locale, category)
        do update set phrases = excluded.phrases, updated_at = now()
      `;
      book[categoryId] = phrases;
    } catch {
      // 일부 실패해도 나머지는 반환
    }
  }

  return NextResponse.json({ book });
}
