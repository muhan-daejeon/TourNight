import { NextRequest, NextResponse } from "next/server";
import {
  listPostBodies,
  getCachedPostTranslations,
  savePostTranslations,
} from "@/lib/community";
import { translateComments } from "@/lib/gemini";
import { routing } from "@/i18n/routing";

/** 한 번의 Gemini 호출에 담을 글 수 — 너무 많으면 응답이 잘릴 수 있어 나눠 보낸다 */
const CHUNK = 20;

/**
 * 최신 글 본문을 접속 언어로 번역해 { post_id → 번역문 }으로 돌려준다.
 * 글 목록이 뜰 때 클라이언트가 한 번 호출해 본문을 바로 접속 언어로 바꾼다.
 * 읽기 기능이라 로그인은 필요 없다. 캐시된 것은 그대로 쓰고 없는 것만 번역·저장한다.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const locale = String(body?.locale ?? "");
  if (!routing.locales.includes(locale as never)) {
    return NextResponse.json({ error: "invalid locale" }, { status: 400 });
  }

  const posts = await listPostBodies();
  if (posts.length === 0) {
    return NextResponse.json({ translations: {} });
  }

  const ids = posts.map((p) => p.id);
  const cached = await getCachedPostTranslations(ids, locale);
  const missing = posts.filter((p) => !(p.id in cached));

  for (let i = 0; i < missing.length; i += CHUNK) {
    const chunk = missing.slice(i, i + CHUNK);
    try {
      const fresh = await translateComments(chunk, locale);
      const toSave = chunk
        .filter((p) => fresh[p.id])
        .map((p) => ({ id: p.id, body: fresh[p.id] }));
      if (toSave.length > 0) {
        await savePostTranslations(locale, toSave);
        for (const t of toSave) cached[t.id] = t.body;
      }
    } catch (err) {
      // 한 묶음이 실패해도 나머지는 계속 — 실패분은 원문으로 보이면 된다
      console.warn(
        "[community] 글 번역 실패 — 원문 유지:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return NextResponse.json({ translations: cached });
}
