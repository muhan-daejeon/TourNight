import { NextRequest, NextResponse } from "next/server";
import { getPersonaCourses } from "@/lib/courses";
import { getVerifiedNightSpots } from "@/lib/spots";
import { PERSONALITY_TYPES, type PersonalityType } from "@/lib/personality-test";
import { routing } from "@/i18n/routing";

/**
 * 성향 테스트 결과의 추천 코스·스팟 데이터.
 *
 * 명소는 getVerifiedNightSpots로 KTO를 실시간 조회한다(kto-live). 이 호출이
 * 로케일당 여러 번이라 빌드 정적 생성에 넣으면 60초를 넘겨 실패하므로, 페이지가
 * 아니라 이 라우트에서 요청 시점에 받아 온다 — 화면(홈·명소)과 같은 실시간 원천을
 * 쓰면서 빌드는 건드리지 않는다. (KTO 응답은 Next fetch 캐시로 1시간 재사용)
 *
 * persona를 주면 그 성향의 수제 코스를 구간 거리·실제 경로까지 붙여 함께 내려준다.
 * 결과 화면이 코스를 바로 펼쳐 보여주고 거기서 다듬기까지 하므로 경유지 이름만으로는
 * 모자란다. 일곱 성향을 다 만들 이유는 없어 해당 성향 하나만 만든다.
 *
 * 예전에는 좌표로 묶은 자동 생성 코스(getCourses)도 함께 내려줬는데, 결과 화면이
 * 수제 코스만 보여주게 되면서 쓰는 곳이 없어졌다 — 매번 헛계산이라 뺐다.
 */
export const dynamic = "force-dynamic";

const isType = (v: unknown): v is PersonalityType =>
  typeof v === "string" && (PERSONALITY_TYPES as readonly string[]).includes(v);

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("locale") ?? "ko";
  const locale = routing.locales.includes(raw as never) ? raw : "ko";
  const personaRaw = request.nextUrl.searchParams.get("persona");
  const persona = isType(personaRaw) ? personaRaw : null;

  try {
    const [spots, personaCourses] = await Promise.all([
      getVerifiedNightSpots(locale),
      persona ? getPersonaCourses(locale, persona) : Promise.resolve({}),
    ]);
    return NextResponse.json({
      spots,
      personaCourse: persona
        ? (personaCourses[persona as keyof typeof personaCourses] ?? null)
        : null,
    });
  } catch (err) {
    console.error(
      "[personality] 추천 데이터 조회 실패:",
      err instanceof Error ? err.message : err,
    );
    // 추천은 부가 정보 — 실패해도 결과 화면은 성향만으로 뜬다
    return NextResponse.json({ spots: [], personaCourse: null });
  }
}
