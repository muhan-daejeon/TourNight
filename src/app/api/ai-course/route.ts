import { NextRequest, NextResponse } from "next/server";
import { getAiCourse, type AiCourse } from "@/lib/courses";
import { sql } from "@/lib/db";
import { routing } from "@/i18n/routing";
import type { NightSpot } from "@/lib/kto";

/** 홈 카테고리 필터와 동일 — 프롬프트 주입 방지를 위해 서버에 정의된 값만 허용 */
const CATEGORIES: NightSpot["category"][] = [
  "science",
  "nature",
  "festival",
  "city",
];

/**
 * AI 코스 짜기: 지도에서 고른 야간 명소를 반드시 거치는 코스를 생성한다.
 * 스팟·언어·선호 카테고리당 1건을 DB에 캐시해 반복 클릭 시 Gemini를 다시 부르지 않는다.
 * (거리 기반 폴백으로 만들어진 코스는 캐시하지 않아 다음 요청에서 다시 AI를 시도한다)
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const contentId = params.get("contentId") ?? "";
  const locale = params.get("locale") ?? "ko";
  const rawCategory = params.get("category") ?? "";

  if (!contentId || !routing.locales.includes(locale as never)) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }
  // 목록에 없는 값은 조용히 무시 (선호 없음으로 처리)
  const prefCategory = CATEGORIES.find((c) => c === rawCategory);
  const cacheCategory = prefCategory ?? "";

  try {
    const cached = await sql<{ course: AiCourse }[]>`
      select course from ai_course_cache
      where content_id = ${contentId} and locale = ${locale}
        and pref_category = ${cacheCategory}
    `;
    // transit이 없는 캐시는 교통 정보 도입 전에 만들어진 것 → 무시하고 재생성
    if (cached.length > 0 && Array.isArray(cached[0].course?.transit)) {
      return NextResponse.json({ course: cached[0].course });
    }
  } catch (err) {
    // 캐시 조회 실패는 치명적이지 않음 — 그대로 생성으로 진행
    console.warn(
      "[ai-course] 캐시 조회 실패:",
      err instanceof Error ? err.message : err,
    );
  }

  let course: AiCourse | null;
  try {
    course = await getAiCourse(contentId, locale, prefCategory);
  } catch (err) {
    console.warn(
      "[ai-course] 코스 생성 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
  if (!course) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (course.source === "ai") {
    try {
      await sql`
        insert into ai_course_cache (content_id, locale, pref_category, course)
        values (${contentId}, ${locale}, ${cacheCategory}, ${
          // 인터페이스에는 인덱스 시그니처가 없어 postgres의 JSONValue로 캐스팅
          sql.json(course as unknown as Parameters<typeof sql.json>[0])
        })
        on conflict (content_id, locale, pref_category)
        do update set course = excluded.course, updated_at = now()
      `;
    } catch (err) {
      console.warn(
        "[ai-course] 캐시 저장 실패:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return NextResponse.json({ course });
}
