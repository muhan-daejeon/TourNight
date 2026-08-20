import { NextRequest, NextResponse } from "next/server";
import {
  getSurveyCourse,
  type Companion,
  type Transport,
} from "@/lib/courses";
import { getActiveSessionUser } from "@/lib/session";
import { isAdmin, logActivity } from "@/lib/activity";
import { consumeCourseQuota } from "@/lib/course-quota";
import { routing } from "@/i18n/routing";
import type { NightSpot } from "@/lib/kto";

/** 프롬프트 주입 방지 — 서버에 정의된 값만 통과시킨다 */
const CATEGORIES: NightSpot["category"][] = [
  "science",
  "nature",
  "festival",
  "city",
];
const TRANSPORTS: Transport[] = ["walk", "transit", "taxi"];
const COMPANIONS: Companion[] = ["solo", "couple", "friends", "family"];

/** 대전 경계에서 넉넉히 잡은 범위 — 엉뚱한 좌표로 전국을 뒤지지 않게 한다 */
const BOUNDS = { minX: 127.2, maxX: 127.6, minY: 36.15, maxY: 36.5 };

/** 야간 서비스라 밤 시간대만 받는다 (17:00~03:00) */
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DURATIONS = [60, 120, 180, 240];

/**
 * 설문 답변으로 맞춤 야간 코스를 만든다.
 *
 * AI 코스(/api/ai-course)와 달리 반드시 거쳐야 할 스팟이 없다. 출발 좌표와 시간
 * 예산에서 후보와 방문지 수를 서버가 정하고, 그 안에서 무엇을 어떤 순서로 볼지를
 * AI가 고른다. 조합이 사실상 무한해 캐시하지 않는다 — 그래서 한도가 더 중요하다.
 */
export async function POST(request: NextRequest) {
  const session = await getActiveSessionUser();
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const mapX = Number(body.mapX);
  const mapY = Number(body.mapY);
  const startTime = String(body.startTime ?? "");
  const durationMin = Number(body.durationMin);
  const transport = body.transport as Transport;
  const companion = body.companion as Companion;
  const locale = String(body.locale ?? "ko");
  const date = String(body.date ?? "");
  const categories = Array.isArray(body.categories)
    ? (body.categories.filter((c) =>
        CATEGORIES.includes(c as NightSpot["category"]),
      ) as NightSpot["category"][])
    : [];

  const invalid =
    !Number.isFinite(mapX) ||
    !Number.isFinite(mapY) ||
    mapX < BOUNDS.minX ||
    mapX > BOUNDS.maxX ||
    mapY < BOUNDS.minY ||
    mapY > BOUNDS.maxY ||
    !TIME_RE.test(startTime) ||
    !DURATIONS.includes(durationMin) ||
    !TRANSPORTS.includes(transport) ||
    !COMPANIONS.includes(companion) ||
    !routing.locales.includes(locale as never) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date);
  if (invalid) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const quota = await consumeCourseQuota(
    session.userId,
    await isAdmin(session.userId),
  );
  if (!quota.ok) {
    return NextResponse.json(
      { error: "daily_limit", limit: quota.limit },
      { status: 429 },
    );
  }

  try {
    const course = await getSurveyCourse({
      mapX,
      mapY,
      startTime,
      durationMin,
      transport,
      companion,
      categories,
      locale,
      date,
    });
    if (!course) {
      // 출발지 주변에 검증된 야간 명소가 거의 없는 경우 (대전 밖 좌표 등)
      return NextResponse.json({ error: "no_candidates" }, { status: 404 });
    }
    logActivity(session.userId, "course_survey", {
      transport,
      companion,
      durationMin,
      categories,
      stops: course.stops.length,
      source: course.source,
    });
    return NextResponse.json({ course });
  } catch (err) {
    console.error(
      "[course-survey] 생성 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "server_error" }, { status: 502 });
  }
}
