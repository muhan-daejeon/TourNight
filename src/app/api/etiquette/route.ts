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

  // 1) 사전생성된 DB 캐시 우선 (심사/데모 안정성 — Gemini 실시간 의존 제거)
  //    DB 미연결이면 캐시를 건너뛰고 실시간 생성으로 진행한다.
  try {
    const cached = await sql<{ content: string }[]>`
      select content from etiquette_cache
      where topic_id = ${topicId} and locale = ${locale}
    `;
    if (cached.length > 0) {
      return NextResponse.json({ text: cached[0].content });
    }
  } catch (err) {
    console.warn(
      "[etiquette] 캐시 조회 실패 — 실시간 생성으로 진행:",
      err instanceof Error ? err.message : err,
    );
  }

  // 2) 캐시 미스(또는 DB 없음)일 때 실시간 생성
  let text: string;
  try {
    text = await generateEtiquette(topicId, locale);
  } catch (err) {
    console.warn(
      "[etiquette] 생성 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }

  // 3) 생성 결과를 캐시에 저장 (DB 없으면 무시 — 응답엔 영향 없음)
  try {
    await sql`
      insert into etiquette_cache (topic_id, locale, content)
      values (${topicId}, ${locale}, ${text})
      on conflict (topic_id, locale)
      do update set content = excluded.content, updated_at = now()
    `;
  } catch (err) {
    console.warn(
      "[etiquette] 캐시 저장 실패(무시):",
      err instanceof Error ? err.message : err,
    );
  }

  return NextResponse.json({ text });
}
