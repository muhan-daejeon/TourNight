import { NextRequest, NextResponse } from "next/server";
import { getCourses } from "@/lib/courses";
import { getVerifiedNightSpots } from "@/lib/spots";
import { routing } from "@/i18n/routing";

/**
 * 성향 테스트 결과의 추천 코스·스팟 데이터.
 *
 * 명소는 getVerifiedNightSpots로 KTO를 실시간 조회한다(kto-live). 이 호출이
 * 로케일당 여러 번이라 빌드 정적 생성에 넣으면 60초를 넘겨 실패하므로, 페이지가
 * 아니라 이 라우트에서 요청 시점에 받아 온다 — 화면(홈·명소)과 같은 실시간 원천을
 * 쓰면서 빌드는 건드리지 않는다. (KTO 응답은 Next fetch 캐시로 1시간 재사용)
 * 코스 카드는 경유지 정보만 쓰므로 경로 계산(TMap/ODsay)은 건너뛴다.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("locale") ?? "ko";
  const locale = routing.locales.includes(raw as never) ? raw : "ko";

  try {
    const [courses, spots] = await Promise.all([
      getCourses(locale, { withRoutes: false }),
      getVerifiedNightSpots(locale),
    ]);
    return NextResponse.json({ courses, spots });
  } catch (err) {
    console.error(
      "[personality] 추천 데이터 조회 실패:",
      err instanceof Error ? err.message : err,
    );
    // 추천은 부가 정보 — 실패해도 결과 화면은 성향만으로 뜬다
    return NextResponse.json({ courses: [], spots: [] });
  }
}
