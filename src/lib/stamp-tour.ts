import { sql } from "./db";
import { deleteCommunityMedia, mediaPublicUrl } from "./storage";

/** 사용자가 고른 관광지 한 곳 + (있다면) 인증사진 */
export interface StampStop {
  name: string;
  lat: number;
  lng: number;
  /** 아직 안 찍었으면 null. 저장은 storage 경로로, 응답은 공개 URL로 내려준다 */
  photoUrl: string | null;
}

export interface StampTour {
  stops: StampStop[];
  /** 4칸이 전부 채워졌는지 — 콜라주 다운로드 가능 여부에 쓴다 */
  complete: boolean;
}

export const STOP_COUNT = 4;

interface StopRow {
  name: string;
  lat: number;
  lng: number;
  photoPath: string | null;
}

function toStampTour(stops: StopRow[]): StampTour {
  const mapped = stops.map((s) => ({
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    photoUrl: s.photoPath ? mediaPublicUrl(s.photoPath) : null,
  }));
  return { stops: mapped, complete: mapped.every((s) => s.photoUrl !== null) };
}

/** 사용자의 도장투어 — 아직 장소를 고르지 않았으면 null */
export async function getStampTour(userId: number): Promise<StampTour | null> {
  const rows = await sql<{ stops: StopRow[] }[]>`
    select stops from stamp_tours where user_id = ${userId}
  `;
  if (!rows.length) return null;
  return toStampTour(rows[0].stops);
}

/**
 * 장소 4곳 확정.
 *
 * 기본은 최초 1회용 — 이미 골라둔 계정이 다시 호출하면 기존 것을 그대로
 * 돌려준다(덮어써서 이미 찍은 도장 사진을 날리지 않는다).
 *
 * opts.reset이 true면 "관광지 다시 선택하기"에서 온 것 — 기존 4곳을 새
 * 장소로 완전히 덮어쓰고, 그때까지 찍어 둔 인증사진 파일도 함께 지운다
 * (다른 장소 사진이 새 장소 밑에 그대로 남아 있으면 안 되므로).
 */
export async function createStampTour(
  userId: number,
  places: { name: string; lat: number; lng: number }[],
  opts: { reset?: boolean } = {},
): Promise<StampTour> {
  if (places.length !== STOP_COUNT) {
    throw new Error(`장소는 정확히 ${STOP_COUNT}곳이어야 합니다`);
  }

  const existingRows = await sql<{ stops: StopRow[] }[]>`
    select stops from stamp_tours where user_id = ${userId}
  `;
  const existing = existingRows[0]?.stops ?? null;
  if (existing && !opts.reset) return toStampTour(existing);

  const stops: StopRow[] = places.map((p) => ({
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    photoPath: null,
  }));

  if (existing) {
    await sql`
      update stamp_tours
      set stops = ${sql.json(stops as unknown as Parameters<typeof sql.json>[0])}, updated_at = now()
      where user_id = ${userId}
    `;
    for (const s of existing) {
      if (s.photoPath) await deleteCommunityMedia(s.photoPath);
    }
  } else {
    await sql`
      insert into stamp_tours (user_id, stops)
      values (${userId}, ${sql.json(stops as unknown as Parameters<typeof sql.json>[0])})
    `;
  }
  return toStampTour(stops);
}

export type StampPhotoResult =
  | { ok: true; tour: StampTour }
  | { ok: false; error: "not-found" | "invalid-slot" };

/**
 * slot(0~3) 칸에 인증사진을 채운다. 이미 그 칸에 사진이 있었다면 옛 파일은 지운다
 * (재도전 허용 — GPS가 안 맞아 취소했다가 다시 찍는 경우 등).
 */
export async function setStampPhoto(
  userId: number,
  slot: number,
  photoPath: string,
): Promise<StampPhotoResult> {
  // 읽고 고쳐서 다시 쓰는 전체 JSONB라 트랜잭션 + 행 잠금으로 감싼다 —
  // 없으면 같은 계정이 두 칸을 거의 동시에 찍을 때 나중 쓰기가 먼저 쓴 칸을 덮어쓸 수 있다
  const result = await sql.begin(async (tx) => {
    const rows = await tx<{ stops: StopRow[] }[]>`
      select stops from stamp_tours where user_id = ${userId} for update
    `;
    if (!rows.length) return { ok: false as const, error: "not-found" as const };
    const stops = rows[0].stops;
    if (!Number.isInteger(slot) || slot < 0 || slot >= stops.length) {
      return { ok: false as const, error: "invalid-slot" as const };
    }

    const prevPath = stops[slot].photoPath;
    stops[slot] = { ...stops[slot], photoPath };

    await tx`
      update stamp_tours
      set stops = ${tx.json(stops as unknown as Parameters<typeof sql.json>[0])}, updated_at = now()
      where user_id = ${userId}
    `;
    return { ok: true as const, stops, prevPath };
  });

  if (!result.ok) return result;
  if (result.prevPath) await deleteCommunityMedia(result.prevPath);
  return { ok: true, tour: toStampTour(result.stops) };
}
