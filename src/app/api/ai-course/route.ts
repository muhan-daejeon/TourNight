import { NextRequest, NextResponse } from "next/server";
import { getAiCourse, type AiCourse } from "@/lib/courses";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { routing } from "@/i18n/routing";
import type { NightSpot } from "@/lib/kto";

/**
 * 계정당 하루 생성 횟수. 코스 한 번에 Gemini + TMap + ODsay + KTO를 모두 부르므로
 * 제한이 없으면 계정 하나가 조합(스팟 42 × 언어 4 × 카테고리 5)을 돌며
 * 외부 API 무료 한도를 하루치씩 태울 수 있다.
 * 캐시 적중은 세지 않으므로, 이미 만든 코스를 다시 보는 건 제한과 무관하다.
 */
const DAILY_LIMIT = 5;

/** 생성한 코스 캐시 유효 기간 */
const CACHE_TTL = "1 hour";

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

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  // 목록에 없는 값은 조용히 무시 (선호 없음으로 처리)
  const prefCategory = CATEGORIES.find((c) => c === rawCategory);
  const cacheCategory = prefCategory ?? "";

  try {
    // 오래된 캐시는 무시한다 — 노선·운영시간이 바뀌어도 예전 코스가 계속 나오면 안 된다
    const cached = await sql<{ course: AiCourse }[]>`
      select course from ai_course_cache
      where content_id = ${contentId} and locale = ${locale}
        and pref_category = ${cacheCategory}
        and updated_at > now() - ${CACHE_TTL}::interval
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

  // 여기부터는 실제 생성 — 캐시로 답한 경우는 위에서 이미 반환됐으므로 세지 않는다.
  // 원자적으로 올리고 그 결과로 판단해, 동시 요청이 한도를 넘기지 못하게 한다.
  try {
    const [{ count }] = await sql<{ count: number }[]>`
      insert into ai_course_usage (user_id, used_on, count)
      values (${session.userId}, current_date, 1)
      on conflict (user_id, used_on)
      do update set count = ai_course_usage.count + 1
      returning count
    `;
    if (count > DAILY_LIMIT) {
      return NextResponse.json(
        { error: "daily_limit", limit: DAILY_LIMIT },
        { status: 429 },
      );
    }
  } catch (err) {
    // 사용량 기록이 실패해도 기능은 막지 않는다 (한도는 최선 노력)
    console.warn(
      "[ai-course] 사용량 기록 실패:",
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
