import { sql } from "./db";

/**
 * 계정당 하루 코스 생성 횟수.
 *
 * 코스 한 번에 Gemini + TMap + ODsay + KTO를 모두 부르므로, 제한이 없으면 계정
 * 하나가 조합을 돌며 외부 API 무료 한도를 하루치씩 태울 수 있다.
 * AI 코스와 설문 코스가 같은 외부 호출을 쓰므로 한도도 함께 센다.
 */
export const COURSE_DAILY_LIMIT = 5;

export interface CourseQuota {
  ok: boolean;
  limit: number;
}

/**
 * 한도를 하나 쓴다. 관리자는 세지 않는다(시연·점검 때 막히면 곤란하다).
 * 캐시 적중은 호출부에서 이 함수를 부르기 전에 반환하므로 한도와 무관하다.
 */
export async function consumeCourseQuota(
  userId: number,
  isAdminUser: boolean,
): Promise<CourseQuota> {
  if (isAdminUser) return { ok: true, limit: COURSE_DAILY_LIMIT };
  try {
    const [{ count }] = await sql<{ count: number }[]>`
      insert into ai_course_usage (user_id, used_on, count)
      values (${userId}, current_date, 1)
      on conflict (user_id, used_on)
      do update set count = ai_course_usage.count + 1
      returning count
    `;
    return { ok: count <= COURSE_DAILY_LIMIT, limit: COURSE_DAILY_LIMIT };
  } catch (err) {
    // 사용량 기록이 실패해도 기능은 막지 않는다 (한도는 최선 노력)
    console.warn(
      "[courses] 사용량 기록 실패:",
      err instanceof Error ? err.message : err,
    );
    return { ok: true, limit: COURSE_DAILY_LIMIT };
  }
}
