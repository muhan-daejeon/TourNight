import { NextRequest, NextResponse } from "next/server";
import { getVerifiedNightSpots } from "@/lib/spots";
import { routing } from "@/i18n/routing";

/**
 * 야간 명소 전체 목록 (경량) — 찜한 장소(SavedSpots)처럼 클라이언트에서
 * localStorage의 북마크 id를 실물 명소로 되살릴 때 쓴다.
 * 원천은 화면들과 동일한 실시간 KTO + 검수 DB (getVerifiedNightSpots).
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("locale") ?? "ko";
  const locale = routing.locales.includes(raw as never) ? raw : "ko";
  try {
    const spots = await getVerifiedNightSpots(locale);
    return NextResponse.json({ spots });
  } catch {
    return NextResponse.json({ spots: [] });
  }
}
