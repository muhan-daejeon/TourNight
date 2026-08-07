import { sql } from "./db";
import { generateCoursePlan, type CourseCandidate } from "./gemini";
import { getNearbySpots, getSpot } from "./spots";
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

/** 지도에서 고른 스팟을 거치도록 AI가 설계한 코스 */
export interface AiCourse extends Course {
  /** 기준이 된 스팟 (사용자가 지도에서 클릭한 곳) */
  anchorId: string;
  title: string;
  summary: string;
  tip: string;
  /** stops와 같은 순서의 방문 이유 (없으면 빈 문자열) */
  notes: string[];
  /** ai = Gemini 설계, distance = Gemini 실패 시 최근접 폴백 */
  source: "ai" | "distance";
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

interface LatLng {
  mapX: number;
  mapY: number;
}

function haversineM(a: LatLng, b: LatLng): number {
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

/** 그리디 최단이웃 경로 — 시작점을 주지 않으면 서쪽 끝에서 출발 */
function orderRoute(spots: CourseStop[], start?: CourseStop): CourseStop[] {
  const remaining = [...spots];
  let current =
    start ?? remaining.reduce((a, b) => (b.mapX < a.mapX ? b : a));
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

/** 주어진 스팟들 사이의 KTO 이동 연결(together) 판별기 */
async function togetherLookup(ids: string[]) {
  const edges = await sql<{ content_id: string; related_content_id: string }[]>`
    select content_id, related_content_id from spot_related
    where content_id = any(${ids}) and related_content_id = any(${ids})
  `;
  const set = new Set(
    edges.map((e) => `${e.content_id}|${e.related_content_id}`),
  );
  return (a: string, b: string) => set.has(`${a}|${b}`) || set.has(`${b}|${a}`);
}

/** stops 순서대로 구간 거리·together를 채워 Course 형태로 만든다 */
async function toCourse(stops: CourseStop[]): Promise<Omit<Course, "id">> {
  const isTogether = await togetherLookup(stops.map((s) => s.contentId));
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
  return { stops, legs, totalM };
}

/**
 * 사용자가 지도에서 고른 스팟(anchor)을 반드시 거치는 코스를 생성한다.
 *
 * 후보는 인근 검증 스팟으로 한정하고, Gemini가 그중 2~3곳을 골라 순서를 정한다.
 * 반환된 contentId는 후보 목록으로 다시 검증하며(환각 방지), anchor가 빠지면 앞에 끼워 넣는다.
 * Gemini 실패·키 미설정 시에는 최근접 스팟 3곳으로 거리 기반 코스를 폴백 생성한다.
 */
export async function getAiCourse(
  contentId: string,
  locale = "ko",
): Promise<AiCourse | null> {
  const anchor = await getSpot(contentId, locale);
  if (!anchor) return null;

  const nearby = await getNearbySpots(contentId, { limit: 8, locale });
  if (!nearby.length) return null;

  const toStop = (s: NightSpot): CourseStop => ({
    contentId: s.contentId,
    title: s.title,
    addr: s.addr,
    category: s.category,
    imageUrl: s.imageUrl,
    mapX: s.mapX,
    mapY: s.mapY,
  });
  const byId = new Map<string, CourseStop>();
  byId.set(anchor.contentId, toStop(anchor));
  nearby.forEach((s) => byId.set(s.contentId, toStop(s)));

  const anchorCandidate: CourseCandidate = {
    contentId: anchor.contentId,
    title: anchor.title,
    category: anchor.category,
    addr: anchor.addr,
    distanceM: 0,
  };
  const candidates: CourseCandidate[] = nearby.map((s) => ({
    contentId: s.contentId,
    title: s.title,
    category: s.category,
    addr: s.addr,
    distanceM: s.distanceM,
  }));

  // 거리 기반 폴백 — anchor에서 가까운 3곳을 최단이웃 순서로
  const fallback = async (): Promise<AiCourse> => {
    const anchorStop = byId.get(anchor.contentId)!;
    const stops = orderRoute(
      [anchorStop, ...nearby.slice(0, 3).map(toStop)],
      anchorStop,
    );
    return {
      id: `ai-${anchor.contentId}`,
      anchorId: anchor.contentId,
      title: anchor.title,
      summary: "",
      tip: "",
      notes: stops.map(() => ""),
      source: "distance",
      ...(await toCourse(stops)),
    };
  };

  try {
    const plan = await generateCoursePlan(anchorCandidate, candidates, locale);

    // 후보에 없는 id·중복 제거 → 그래도 anchor는 반드시 포함
    const seen = new Set<string>();
    const picked = plan.stops.filter((s) => {
      if (!byId.has(s.contentId) || seen.has(s.contentId)) return false;
      seen.add(s.contentId);
      return true;
    });
    if (!seen.has(anchor.contentId)) {
      picked.unshift({ contentId: anchor.contentId, note: "" });
    }
    if (picked.length < 2) return fallback();

    const stops = picked.map((p) => byId.get(p.contentId)!);
    return {
      id: `ai-${anchor.contentId}`,
      anchorId: anchor.contentId,
      title: plan.title || anchor.title,
      summary: plan.summary,
      tip: plan.tip,
      notes: picked.map((p) => p.note),
      source: "ai",
      ...(await toCourse(stops)),
    };
  } catch (err) {
    console.warn(
      "[courses] AI 코스 생성 실패 — 거리 기반으로 폴백합니다:",
      err instanceof Error ? err.message : err,
    );
    return fallback();
  }
}
