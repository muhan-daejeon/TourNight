import { NextRequest, NextResponse } from "next/server";
import { translateCommunityText } from "@/lib/gemini";
import {
  getCachedTranslation,
  getContentBody,
  setCachedTranslation,
} from "@/lib/community";
import { routing } from "@/i18n/routing";
import { getSessionUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

/**
 * 커뮤니티 글·댓글 번역 — 화면 언어와 다른 언어로 쓰인 글 옆 "(번역)" 버튼이 부른다.
 *
 * 클라이언트가 보낸 텍스트를 그대로 번역하지 않고 targetType/targetId로 원문을
 * 서버에서 다시 읽는다 — 화면에 실제로 올라와 있는 글과 다른 텍스트를 몰래
 * 번역시키는 것을 막고(프롬프트 주입 우회로), 삭제된 글도 자연히 404가 된다.
 * 대상·언어당 한 번만 Gemini를 부르고 이후는 phrase_search_cache와 같은 방식으로
 * DB 캐시에서 바로 돌려준다.
 */
export async function GET(request: NextRequest) {
  const targetType = request.nextUrl.searchParams.get("targetType");
  const targetId = Number(request.nextUrl.searchParams.get("targetId"));
  const locale = request.nextUrl.searchParams.get("locale") ?? "";

  if (targetType !== "post" && targetType !== "comment") {
    return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  }
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  }
  if (!routing.locales.includes(locale as never)) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  }

  const cached = await getCachedTranslation(targetType, targetId, locale);
  if (cached !== null) {
    return NextResponse.json({ text: cached });
  }

  const original = await getContentBody(targetType, targetId);
  if (original === null) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const translated = await translateCommunityText(original, locale);
    await setCachedTranslation(targetType, targetId, locale, translated);
    logActivity((await getSessionUser())?.userId ?? null, "community_translate", {
      targetType,
      targetId,
      locale,
    });
    return NextResponse.json({ text: translated });
  } catch (err) {
    console.error(
      "[community] 번역 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "translation failed" }, { status: 502 });
  }
}
