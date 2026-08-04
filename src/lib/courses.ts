import { sql } from "./db";
import type { NightSpot } from "./kto";

export interface CourseStop {
  contentId: string;
  title: string;
  addr: string;
  category: NightSpot["category"];
  imageUrl: string | null;
  mapX: number;
  mapY: number;
}

export interface CourseLeg {
  distanceM: number;
  together: boolean; // KTO 차량 이동 데이터로 함께 방문되는 연결
}

export interface Course {
  id: string;
  stops: CourseStop[];
  legs: CourseLeg[]; // stops 사이 구간 (길이 = stops.length - 1)
  totalM: number;
}

interface SpotRow {
  content_id: string;
  title: string;
  addr: string;
  category: string;
  image_url: string | null;
  mapx: number;
  mapy: number;
  cl: number;
}

function haversineM(a: CourseStop, b: CourseStop): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.mapY - a.mapY);
  const dLng = toRad(b.mapX - a.mapX);
  const lat1 = toRad(a.mapY);
  const lat2 = toRad(b.mapY);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 서쪽 끝에서 시작하는 그리디 최단이웃 경로 */
function orderRoute(spots: CourseStop[]): CourseStop[] {
  const remaining = [...spots];
  let current = remaining.reduce((a, b) => (b.mapX < a.mapX ? b : a));
  remaining.splice(remaining.indexOf(current), 1);
  const path = [current];
  while (remaining.length) {
    let nearest = remaining[0];
    for (const s of remaining) {
      if (haversineM(current, s) < haversineM(current, nearest)) nearest = s;
    }
    remaining.splice(remaining.indexOf(nearest), 1);
    path.push(nearest);
    current = nearest;
  }
  return path;
}

/**
 * 검증 야간명소를 근접 클러스터로 묶어 드라이브 코스를 만든다.
 * 각 코스는 최단이웃 순서로 정렬하고, 연속 구간이 KTO 이동 데이터로 연결되면
 * together 플래그를 켠다. DB 실패 시 빈 배열 폴백.
 */
export async function getCourses(
  locale = "ko",
  { maxCourses = 5, maxStops = 5, minStops = 3 } = {},
): Promise<Course[]> {
  try {
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int n from night_spots
      where night_verified = true and image_url is not null
    `;
    if (n < minStops) return [];
    const k = Math.min(10, Math.max(3, Math.round(n / 4)));

    const rows = await sql<SpotRow[]>`
      select s.content_id, coalesce(tr.title, s.title) as title, s.addr,
             s.category, s.image_url,
             st_x(s.geom) as mapx, st_y(s.geom) as mapy,
             st_clusterkmeans(s.geom, ${k}) over () as cl
      from night_spots s
      left join spot_translations tr
        on tr.content_id = s.content_id and tr.locale = ${locale}
      where s.night_verified = true and s.image_url is not null
    `;

    const edges = await sql<
      { content_id: string; related_content_id: string }[]
    >`select content_id, related_content_id from spot_related`;
    const together = new Set(
      edges.map((e) => `${e.content_id}|${e.related_content_id}`),
    );
    const isTogether = (a: string, b: string) =>
      together.has(`${a}|${b}`) || together.has(`${b}|${a}`);

    const toStop = (r: SpotRow): CourseStop => ({
      contentId: r.content_id,
      title: r.title,
      addr: r.addr,
      category: r.category as NightSpot["category"],
      imageUrl: r.image_url,
      mapX: Number(r.mapx),
      mapY: Number(r.mapy),
    });

    const clusters = new Map<number, CourseStop[]>();
    for (const r of rows) {
      const arr = clusters.get(r.cl) ?? [];
      arr.push(toStop(r));
      clusters.set(r.cl, arr);
    }

    const courses: Course[] = [];
    for (const group of clusters.values()) {
      if (group.length < minStops) continue;
      const stops = orderRoute(group).slice(0, maxStops);
      const legs: CourseLeg[] = [];
      let totalM = 0;
      for (let i = 0; i < stops.length - 1; i++) {
        const d = Math.round(haversineM(stops[i], stops[i + 1]));
        totalM += d;
        legs.push({
          distanceM: d,
          together: isTogether(stops[i].contentId, stops[i + 1].contentId),
        });
      }
      courses.push({ id: stops[0].contentId, stops, legs, totalM });
    }

    // 스팟 많은 순 → 이동거리 짧은 순
    courses.sort((a, b) => b.stops.length - a.stops.length || a.totalM - b.totalM);
    return courses.slice(0, maxCourses);
  } catch (err) {
    console.warn(
      "[courses] 코스 생성 실패 — 빈 목록으로 폴백합니다:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}
