/**
 * 밤 동네 계산. 클라이언트 컴포넌트가 직접 쓰므로 여기엔 서버 전용 의존성
 * (DB 등)을 두지 않는다 — local-spots.ts에서 가져오면 postgres가 브라우저
 * 번들에 딸려 들어가 빌드가 깨진다.
 */

function haversineM(a: { mapX: number; mapY: number }, b: { mapX: number; mapY: number }) {
  const R = 6371000;
  const dLat = ((b.mapY - a.mapY) * Math.PI) / 180;
  const dLng = ((b.mapX - a.mapX) * Math.PI) / 180;
  const la1 = (a.mapY * Math.PI) / 180;
  const la2 = (b.mapY * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * 밤 동네. 나이트 라이프는 자치구가 아니라 "어느 동네에서 노느냐"로 읽힌다.
 * 중심 좌표에서 반경 안이면 그 동네, 어디에도 안 들면 '그 외'.
 */
export const NIGHT_AREAS = [
  { id: "yuseong", mapX: 127.341, mapY: 36.3536, radiusM: 2000 }, // 유성온천
  { id: "dunsan", mapX: 127.3845, mapY: 36.3504, radiusM: 1800 }, // 둔산·시청
  { id: "expo", mapX: 127.389, mapY: 36.3757, radiusM: 1800 }, // 엑스포·갑천
  { id: "downtown", mapX: 127.431, mapY: 36.33, radiusM: 1500 }, // 원도심(은행동·대전역)
] as const;
export type NightAreaId = (typeof NIGHT_AREAS)[number]["id"] | "other";

export function areaOf(p: { mapX: number; mapY: number }): NightAreaId {
  let best: { id: NightAreaId; d: number } | null = null;
  for (const a of NIGHT_AREAS) {
    const d = haversineM(p, a);
    if (d <= a.radiusM && (!best || d < best.d)) best = { id: a.id, d };
  }
  return best?.id ?? "other";
}
