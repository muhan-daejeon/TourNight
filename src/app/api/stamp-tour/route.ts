import { NextRequest, NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/session";
import { createStampTour, getStampTour, STOP_COUNT } from "@/lib/stamp-tour";

/** 내 도장투어 조회 — 아직 장소를 안 골랐으면 tour: null */
export async function GET() {
  const session = await getActiveSessionUser();
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  const tour = await getStampTour(session.userId);
  return NextResponse.json({ tour });
}

interface PlaceInput {
  name?: unknown;
  lat?: unknown;
  lng?: unknown;
}

/**
 * 장소 4곳 확정 — 기본은 최초 1회만 의미 있고, 이미 골랐으면 기존 것을 그대로
 * 돌려준다. reset:true면 "관광지 다시 선택하기"에서 온 것 — 기존 4곳(과 그동안
 * 찍은 인증사진)을 지우고 새로 고른 4곳으로 덮어쓴다.
 */
export async function POST(request: NextRequest) {
  const session = await getActiveSessionUser();
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  let payload: { places?: PlaceInput[]; reset?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const reset = payload.reset === true;
  const raw = Array.isArray(payload.places) ? payload.places : [];
  if (raw.length !== STOP_COUNT) {
    return NextResponse.json({ error: "need_exactly_four" }, { status: 400 });
  }

  const places: { name: string; lat: number; lng: number }[] = [];
  for (const p of raw) {
    const name = typeof p.name === "string" ? p.name.trim().slice(0, 80) : "";
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "invalid_place" }, { status: 400 });
    }
    places.push({ name, lat, lng });
  }

  try {
    const tour = await createStampTour(session.userId, places, { reset });
    return NextResponse.json({ tour }, { status: 201 });
  } catch (err) {
    console.error(
      "[stamp-tour] 저장 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "save failed" }, { status: 502 });
  }
}
