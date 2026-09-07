import { NextResponse } from "next/server";
import { getTashuStations } from "@/lib/tashu";

/** 타슈 대여소 실시간 현황 — 읽기 전용 공개 데이터라 로그인 불필요 */
export async function GET() {
  try {
    const stations = await getTashuStations();
    return NextResponse.json({ stations });
  } catch (err) {
    console.error(
      "[tashu] 대여소 조회 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
