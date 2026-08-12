import { sql } from "./db";
import { generateCoursePlan, type CourseCandidate } from "./gemini";
import { getNearbySpots, getSpot } from "./spots";
import { getTransitForSpots, type SpotTransit } from "./transit";
import { getRoutesForLegs, type SpotRoute } from "./routes";
import { fetchNearbyStays, type NearbyStay, type NightSpot } from "./kto";

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
  distanceM: number; // 직선거리
  together: boolean; // KTO 차량 이동 데이터로 함께 방문되는 연결
  /** 실제 도보 경로 (TMap). 키 미설정·호출 실패 시 null */
  walk?: SpotRoute | null;
  /** 택시(TMap 자동차) — 소요시간과 예상 요금 */
  taxi?: SpotRoute | null;
  /** 실제 대중교통 경로 (TMap) */
  transit?: SpotRoute | null;
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
  /** stops와 같은 순서의 인근 정류장·막차 (정보 없으면 null) */
  transit: (SpotTransit | null)[];
  /** 코스를 짤 때 우선한 카테고리 (홈 필터 기준, 없으면 null) */
  prefCategory: NightSpot["category"] | null;
  /** 마지막 스팟 인근 숙소 — 야간 일정이 끝나는 곳에서 묵는 게 자연스럽다 */
  stays: NearbyStay[];
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
    const top = courses.slice(0, maxCourses);

    // 노출되는 코스의 구간에만 실제 경로를 붙인다. AI 코스만 실제 경로가 나오면
    // 같은 화면에서 위아래가 따로 노는 셈이라 추천 코스도 맞춘다.
    // 결과는 spot_route에 캐시돼, 클러스터가 그대로인 한 재생성 때는 호출이 0이다.
    try {
      const pairs = top.flatMap((c) =>
        c.stops.slice(0, -1).map((from, i) => ({ from, to: c.stops[i + 1] })),
      );
      const routes = await getRoutesForLegs(pairs);
      for (const c of top) {
        c.legs.forEach((leg, i) => {
          const r = routes.get(`${c.stops[i].contentId}|${c.stops[i + 1].contentId}`);
          leg.walk = r?.walk ?? null;
          leg.transit = r?.transit ?? null;
          leg.taxi = r?.taxi ?? null;
        });
      }
    } catch (err) {
      // 경로는 부가 정보 — 실패해도 코스 목록은 그대로 보여준다
      console.warn(
        "[courses] 추천 코스 경로 조회 실패 — 직선으로 표시합니다:",
        err instanceof Error ? err.message : err,
      );
    }

    return top;
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

/**
 * stops 순서대로 구간 거리·together를 채워 Course 형태로 만든다.
 * withRoutes를 주면 각 구간의 실제 도보·대중교통 경로도 함께 붙인다
 * (AI 코스에서만 사용 — 추천 코스 목록까지 하면 호출이 과해진다).
 */
async function toCourse(
  stops: CourseStop[],
  withRoutes = false,
): Promise<Omit<Course, "id">> {
  const isTogether = await togetherLookup(stops.map((s) => s.contentId));

  const pairs = stops.slice(0, -1).map((from, i) => ({ from, to: stops[i + 1] }));
  const routes = withRoutes ? await getRoutesForLegs(pairs) : null;

  const legs: CourseLeg[] = [];
  let totalM = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const d = Math.round(haversineM(stops[i], stops[i + 1]));
    totalM += d;
    const r = routes?.get(`${stops[i].contentId}|${stops[i + 1].contentId}`);
    legs.push({
      distanceM: d,
      together: isTogether(stops[i].contentId, stops[i + 1].contentId),
      walk: r?.walk ?? null,
      transit: r?.transit ?? null,
      taxi: r?.taxi ?? null,
    });
  }
  return { stops, legs, totalM };
}

/**
 * 코스 마지막 스팟 인근 숙소. 야간 일정이 끝나는 지점이 곧 묵을 곳이라 거기 기준으로 찾는다.
 * KTO 키가 없거나 조회가 실패하면 빈 배열 — 숙소는 부가 정보라 코스 생성을 막지 않는다.
 */
async function staysNearLastStop(stops: CourseStop[]): Promise<NearbyStay[]> {
  const last = stops[stops.length - 1];
  if (!last) return [];
  try {
    return await fetchNearbyStays(last.mapX, last.mapY, { radius: 3000, limit: 3 });
  } catch (err) {
    console.warn(
      "[courses] 숙소 조회 실패 — 숙소 없이 진행합니다:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

/**
 * 사용자가 지도에서 고른 스팟(anchor)을 반드시 거치는 코스를 생성한다.
 *
 * 후보는 인근 검증 스팟으로 한정하고, Gemini가 그중 2~3곳을 골라 순서를 정한다.
 * 반환된 contentId는 후보 목록으로 다시 검증하며(환각 방지), anchor가 빠지면 앞에 끼워 넣는다.
 * Gemini 실패·키 미설정 시에는 최근접 스팟 3곳으로 거리 기반 코스를 폴백 생성한다.
 *
 * prefCategory(홈에서 켜둔 카테고리 필터)를 주면 같은 카테고리를 우선하되 강제하지는 않는다.
 * 거리순 후보만으로는 해당 카테고리가 한 곳도 안 뽑힐 수 있어, 같은 카테고리 후보를
 * 따로 조회해 합친다.
 */
export async function getAiCourse(
  contentId: string,
  locale = "ko",
  prefCategory?: NightSpot["category"],
): Promise<AiCourse | null> {
  const anchor = await getSpot(contentId, locale);
  if (!anchor) return null;

  const [near, sameCat] = await Promise.all([
    getNearbySpots(contentId, { limit: 8, locale }),
    prefCategory
      ? getNearbySpots(contentId, { limit: 5, locale, category: prefCategory })
      : Promise.resolve([]),
  ]);
  // 거리순 후보 + 선호 카테고리 후보 (중복 제거, 가까운 순)
  const nearby = [...new Map([...near, ...sameCat].map((s) => [s.contentId, s])).values()]
    .sort((a, b) => a.distanceM - b.distanceM);
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

  // 후보 전체의 막차 정보 — 프롬프트에 넣어 "막차 전에 돌 수 있는 순서"를 짜게 한다
  const transitMap = await getTransitForSpots([...byId.keys()]);
  const lastBusOf = (id: string) => transitMap.get(id)?.lastBus ?? null;

  const anchorCandidate: CourseCandidate = {
    contentId: anchor.contentId,
    title: anchor.title,
    category: anchor.category,
    addr: anchor.addr,
    distanceM: 0,
    lastBus: lastBusOf(anchor.contentId),
  };
  const candidates: CourseCandidate[] = nearby.map((s) => ({
    contentId: s.contentId,
    title: s.title,
    category: s.category,
    addr: s.addr,
    distanceM: s.distanceM,
    lastBus: lastBusOf(s.contentId),
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
      transit: stops.map((s) => transitMap.get(s.contentId) ?? null),
      prefCategory: prefCategory ?? null,
      stays: await staysNearLastStop(stops),
      source: "distance",
      ...(await toCourse(stops, true)),
    };
  };

  try {
    const plan = await generateCoursePlan(
      anchorCandidate,
      candidates,
      locale,
      prefCategory,
    );

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
      transit: stops.map((s) => transitMap.get(s.contentId) ?? null),
      prefCategory: prefCategory ?? null,
      stays: await staysNearLastStop(stops),
      source: "ai",
      ...(await toCourse(stops, true)),
    };
  } catch (err) {
    console.warn(
      "[courses] AI 코스 생성 실패 — 거리 기반으로 폴백합니다:",
      err instanceof Error ? err.message : err,
    );
    return fallback();
  }
}
