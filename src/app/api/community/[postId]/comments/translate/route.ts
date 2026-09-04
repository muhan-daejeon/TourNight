import { NextRequest, NextResponse } from "next/server";
import {
  listCommentBodies,
  getCachedCommentTranslations,
  saveCommentTranslations,
} from "@/lib/community";
import { translateComments } from "@/lib/gemini";
import { routing } from "@/i18n/routing";

/**
 * 특정 글의 댓글을 접속 언어로 번역해 { comment_id → 번역문 }으로 돌려준다.
 * 읽기 기능이라 로그인은 필요 없다 (댓글 GET과 동일).
 *
 * 캐시에 있는 번역은 그대로 쓰고, 없는 것만 Gemini로 한 번에 번역해 저장한다.
 * 번역 호출이 실패해도 캐시된 것만이라도 돌려준다 — 클라이언트는 나머지를
 * 원문으로 보여주면 되므로 500으로 화면을 막지 않는다.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ postId: string }> },
) {
  const postId = Number((await ctx.params).postId);
  if (!Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json({ error: "invalid post id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const locale = String(body?.locale ?? "");
  if (!routing.locales.includes(locale as never)) {
    return NextResponse.json({ error: "invalid locale" }, { status: 400 });
  }

  const comments = await listCommentBodies(postId);
  if (comments.length === 0) {
    return NextResponse.json({ translations: {} });
  }

  const ids = comments.map((c) => c.id);
  const cached = await getCachedCommentTranslations(ids, locale);
  const missing = comments.filter((c) => !(c.id in cached));

  if (missing.length > 0) {
    try {
      const fresh = await translateComments(missing, locale);
      const toSave = missing
        .filter((c) => fresh[c.id])
        .map((c) => ({ id: c.id, body: fresh[c.id] }));
      if (toSave.length > 0) {
        await saveCommentTranslations(locale, toSave);
        for (const t of toSave) cached[t.id] = t.body;
      }
    } catch (err) {
      console.warn(
        "[community] 댓글 번역 실패 — 캐시된 것만 돌려줍니다:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return NextResponse.json({ translations: cached });
}
