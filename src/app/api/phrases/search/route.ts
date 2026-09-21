import { NextRequest, NextResponse } from "next/server";
import { translatePhrase } from "@/lib/gemini";
import { sql } from "@/lib/db";
import { routing } from "@/i18n/routing";
import { getSessionUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

/** 하고 싶은 말 검색 → 한국어 번역 + 관련 표현 (질문·언어별 캐시) */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";

  if (!q || q.length > 80 || !routing.locales.includes(locale as never)) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  // AI 를 쓰는 기능은 로그인이 있어야 한다 — 번역 한 건마다 Gemini 호출이라
  // 아무나 무한히 돌리게 둘 수 없고, 팀 방침이 "AI 요소는 회원에게만"이다
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  logActivity(session.userId, "phrase_search", {
    query: q.slice(0, 60),
    locale,
  });

  const norm = q.toLowerCase().replace(/\s+/g, " ");
  const cached = await sql<{ result: unknown }[]>`
    select result from phrase_search_cache
    where locale = ${locale} and query_norm = ${norm}
  `;
  if (cached.length > 0) {
    return NextResponse.json(cached[0].result);
  }

  try {
    const result = await translatePhrase(q, locale);
    await sql`
      insert into phrase_search_cache (locale, query_norm, result)
      values (${locale}, ${norm}, ${sql.json(result as unknown as Parameters<typeof sql.json>[0])})
      on conflict (locale, query_norm)
      do update set result = excluded.result, updated_at = now()
    `;
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "translation failed" }, { status: 502 });
  }
}
