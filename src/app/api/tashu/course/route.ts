import { NextRequest, NextResponse } from "next/server";
import { toCourse, type Course, type CourseStop } from "@/lib/courses";
import { TASHU_COURSES, type BikeLocale } from "@/lib/tashu-courses";

/**
 * 타슈 추천 코스를 코스 만들기와 같은 형태(Course)로 돌려준다 — 코스 만들기
 * 화면과 완전히 같은 지도(CourseMap)·이동수단 패널(RoutePanel)을 그대로
 * 쓰기 위해서다 (피드백: 타슈 코스도 코스 만들기와 똑같이 해달라).
 *
 * 타슈 코스 지점은 KTO 명소가 아니라 좌표만 미리 정해 둔 것이라, 코스
 * 만들기와 같은 캐시 키로 쓸 가짜 contentId를 붙인다. 그 덕에
 * 실제 도보 경로(toCourse의 withRoutes)도 spot_route에 그대로 캐시된다.
 *
 * contentId에 좌표를 함께 넣는다 — 예전엔 순번만 붙였더니(tashu-<id>-0)
 * 지점 좌표를 고쳐도 옛 좌표로 계산된 경로가 캐시에서 그대로 나와,
 * 지도에 코스와 무관한 길이 그려졌다. 좌표가 바뀌면 키도 바뀌어 새로 계산한다.
 */
const stopId = (courseId: string, i: number, lat: number, lng: number) =>
  `tashu-${courseId}-${i}@${lat},${lng}`;
export async function GET(request: NextRequest) {
  const courseId = request.nextUrl.searchParams.get("courseId");
  const rawLocale = request.nextUrl.searchParams.get("locale");
  const locale = (["ko", "en", "ja", "zh"].includes(rawLocale ?? "")
    ? rawLocale
    : "en") as BikeLocale;

  const tashu = TASHU_COURSES.find((c) => c.id === courseId);
  if (!tashu) {
    return NextResponse.json({ error: "unknown course" }, { status: 404 });
  }

  const stops: CourseStop[] = [
    {
      contentId: stopId(tashu.id, 0, tashu.start.lat, tashu.start.lng),
      title: tashu.startName[locale],
      addr: "",
      category: "city",
      imageUrl: null,
      mapX: tashu.start.lng,
      mapY: tashu.start.lat,
    },
    ...tashu.stops.map((s, i) => ({
      contentId: stopId(tashu.id, i + 1, s.lat, s.lng),
      title: s[locale],
      addr: "",
      category: "city" as const,
      imageUrl: null,
      mapX: s.lng,
      mapY: s.lat,
    })),
  ];

  try {
    const built = await toCourse(stops, true);
    const course: Course = { id: tashu.id, ...built };
    return NextResponse.json({ course });
  } catch (err) {
    console.error(
      "[tashu] 코스 경로 조회 실패:",
      err instanceof Error ? err.message : err,
    );
    // 실패해도 직선 좌표만으로 지도는 그릴 수 있게 경로 없는 코스를 준다
    const fallback: Course = { id: tashu.id, stops, legs: [], totalM: 0 };
    return NextResponse.json({ course: fallback });
  }
}
