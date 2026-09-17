import { NextRequest, NextResponse } from "next/server";
import { getRoutesForLegs } from "@/lib/routes";
import { TASHU_COURSES } from "@/lib/tashu-courses";

/**
 * 타슈 추천 코스의 실제 이동 경로 — 출발지→경유지를 좌표 직선이 아니라
 * 실제 도로(TMap 보행자 경로)를 따라 잇는다 (피드백: 자전거·보행도로 API로
 * 짜달라). 카카오맵 JS SDK 자체에는 길찾기가 없고, 대전 자전거도로 전용
 * 데이터도 공개 API가 없어 이미 코스 화면에서 쓰는 TMap 보행자 경로로
 * 대신한다 — 인도·차도를 따라가므로 좌표를 일직선으로 잇는 것보다
 * 실제 라이딩 동선에 훨씬 가깝다.
 *
 * 구간별로 spot_route에 캐시되므로(getRoutesForLegs), 같은 코스를 다시
 * 누르면 TMap을 다시 부르지 않는다.
 */
export async function GET(request: NextRequest) {
  const courseId = request.nextUrl.searchParams.get("courseId");
  const course = TASHU_COURSES.find((c) => c.id === courseId);
  if (!course) {
    return NextResponse.json({ error: "unknown course" }, { status: 404 });
  }

  // 타슈 코스 지점엔 KTO contentId가 없으니, 캐시 키로만 쓸 안정된 가짜 id를 붙인다
  const points = [course.start, ...course.stops].map((p, i) => ({
    contentId: `tashu-${course.id}-${i}`,
    mapX: p.lng,
    mapY: p.lat,
  }));
  const pairs = points.slice(0, -1).map((from, i) => ({ from, to: points[i + 1] }));

  try {
    const routes = await getRoutesForLegs(pairs);
    const legs = pairs.map(({ from, to }) => {
      const r = routes.get(`${from.contentId}|${to.contentId}`);
      const walk = r?.walk;
      if (walk?.status === "ok" && walk.legs.length) {
        // TMap 좌표는 [경도, 위도] — 클라이언트(카카오맵)에 그대로 넘긴다
        return walk.legs.flatMap((seg) => seg.path);
      }
      return null; // 실패한 구간은 클라이언트가 직선으로 대신 잇는다
    });
    return NextResponse.json({ legs });
  } catch (err) {
    console.error(
      "[tashu] 코스 경로 조회 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ legs: pairs.map(() => null) });
  }
}
