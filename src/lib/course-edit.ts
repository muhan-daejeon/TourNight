import type { Course, CourseLeg, CourseStop } from "./courses";

/**
 * 사용자가 고친 코스를 다시 Course로 맞춰 주는 도구 (브라우저에서 돈다).
 *
 * 코스 생성은 서버에서만 할 수 있지만(KTO·TMap 키), 경유지를 더하거나 빼고
 * 순서를 바꾸는 정도는 굳이 서버를 다시 부를 일이 아니다. 그래서 여기서
 * 구간을 다시 계산한다 — courses.ts는 DB·Gemini를 끌고 오므로 클라이언트에서
 * 못 쓰고, 좌표 계산만 따로 둔다.
 */

const R = 6_371_000;

/** 두 좌표 사이 직선거리(m) */
export function haversineM(
  a: { mapX: number; mapY: number },
  b: { mapX: number; mapY: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.mapY - a.mapY);
  const dLng = toRad(b.mapX - a.mapX);
  const lat1 = toRad(a.mapY);
  const lat2 = toRad(b.mapY);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 경유지를 바꾼 코스를 다시 만든다.
 *
 * 원래 코스에 있던 연결(A→B)이 그대로 남아 있으면 그 구간 정보를 재사용한다 —
 * 실제 도보·대중교통 경로는 서버에서 TMap으로 받아 온 것이라 여기서 다시
 * 만들 수 없기 때문이다. 새로 생긴 연결은 직선거리만 채우고, 화면은 이미
 * 경로가 없는 구간을 직선으로 그리게 되어 있다.
 *
 * AI 코스처럼 stops와 나란한 배열(방문 이유·인근 정류장)을 가진 코스는
 * 순서가 바뀌면 설명이 엉뚱한 곳에 붙으므로 contentId로 다시 맞춘다.
 */
export function rebuildCourse<T extends Course>(base: T, stops: CourseStop[]): T {
  const known = new Map<string, CourseLeg>();
  base.stops.slice(0, -1).forEach((from, i) => {
    known.set(`${from.contentId}|${base.stops[i + 1].contentId}`, base.legs[i]);
  });

  const legs: CourseLeg[] = [];
  let totalM = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const hit = known.get(`${stops[i].contentId}|${stops[i + 1].contentId}`);
    const leg: CourseLeg = hit ?? {
      distanceM: Math.round(haversineM(stops[i], stops[i + 1])),
      together: false,
    };
    totalM += leg.distanceM;
    legs.push(leg);
  }

  const next = { ...base, stops, legs, totalM };

  const at = new Map(base.stops.map((s, i) => [s.contentId, i]));
  const realign = <V>(arr: V[], empty: V): V[] =>
    stops.map((s) => {
      const i = at.get(s.contentId);
      return i === undefined ? empty : (arr[i] ?? empty);
    });

  const extra = next as { notes?: string[]; transit?: unknown[] };
  if (Array.isArray(extra.notes)) extra.notes = realign(extra.notes, "");
  if (Array.isArray(extra.transit)) extra.transit = realign(extra.transit, null);

  return next;
}
