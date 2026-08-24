import {
  generateCoursePlan,
  generateSurveyCourse,
  type CourseCandidate,
} from "./gemini";
import {
  getCongestionForSpots,
  getNearbySpots,
  getSpot,
  getSpotsNearPoint,
  getVerifiedNightSpots,
} from "./spots";
import { getRelatedRows, normName } from "./kto-stats";
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
  /** 여러 곳을 담아 만든 코스면 전체 앵커 목록 (한 곳이면 [anchorId]) */
  anchorIds?: string[];
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

/**
 * 좌표로 k개 무리 짓기 (Lloyd k-means).
 *
 * 전에는 PostGIS st_clusterkmeans로 DB에서 묶었는데, 명소를 저장하지 않고
 * 실시간으로 받게 되면서 좌표도 DB에 없다. 대전 한 도시 범위라 위경도를
 * 평면으로 봐도 오차가 무시할 만하다.
 *
 * 초기 중심은 정렬된 목록에서 균등 간격으로 고른다 — 난수를 쓰면 같은 입력에도
 * 코스가 매번 달라져 캐시·화면이 흔들린다.
 */
function clusterByLocation(spots: CourseStop[], k: number): CourseStop[][] {
  if (spots.length <= k) return spots.map((s) => [s]);

  const sorted = [...spots].sort(
    (a, b) => a.mapX - b.mapX || a.mapY - b.mapY,
  );
  const step = sorted.length / k;
  let centers = Array.from({ length: k }, (_, i) => {
    const s = sorted[Math.floor(i * step)];
    return { x: s.mapX, y: s.mapY };
  });

  let groups: CourseStop[][] = [];
  for (let iter = 0; iter < 20; iter++) {
    groups = Array.from({ length: k }, () => [] as CourseStop[]);
    for (const s of sorted) {
      let best = 0;
      let bestD = Infinity;
      centers.forEach((c, i) => {
        const d = (s.mapX - c.x) ** 2 + (s.mapY - c.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      groups[best].push(s);
    }
    const next = groups.map((g, i) =>
      g.length === 0
        ? centers[i]
        : {
            x: g.reduce((t, s) => t + s.mapX, 0) / g.length,
            y: g.reduce((t, s) => t + s.mapY, 0) / g.length,
          },
    );
    const moved = next.some(
      (c, i) => Math.abs(c.x - centers[i].x) > 1e-9 || Math.abs(c.y - centers[i].y) > 1e-9,
    );
    centers = next;
    if (!moved) break;
  }
  return groups.filter((g) => g.length > 0);
}

/**
 * 이름으로 맞춘 KTO 연관 관광지 판별기.
 *
 * 연관 통계 API는 contentId가 아니라 관광지 이름으로 응답하므로, 우리 명소
 * 제목과 이름을 정규화해 맞춘다. (전에는 이 결과를 spot_related에 적재해 뒀다)
 */
async function togetherByName(spots: { contentId: string; title: string }[]) {
  try {
    const rows = await getRelatedRows();
    const idByName = new Map(spots.map((s) => [normName(s.title), s.contentId]));
    const set = new Set<string>();
    for (const r of rows) {
      const a = idByName.get(normName(r.tAtsNm));
      const b = idByName.get(normName(r.rlteTatsNm));
      if (a && b && a !== b) set.add(`${a}|${b}`);
    }
    return (a: string, b: string) => set.has(`${a}|${b}`) || set.has(`${b}|${a}`);
  } catch (err) {
    console.warn(
      "[courses] 연관 관광지 조회 실패:",
      err instanceof Error ? err.message : err,
    );
    return () => false;
  }
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
  { maxCourses = 5, maxStops = 5, minStops = 3, withRoutes = true } = {},
): Promise<Course[]> {
  try {
    // 명소는 KTO 실시간 목록을 쓴다 (제목·주소·좌표·사진 모두 원천 그대로)
    const spots = await getVerifiedNightSpots(locale);
    const n = spots.length;
    if (n < minStops) return [];
    const k = Math.min(10, Math.max(3, Math.round(n / 4)));

    const stopsAll: CourseStop[] = spots.map((s) => ({
      contentId: s.contentId,
      title: s.title,
      addr: s.addr,
      category: s.category,
      imageUrl: s.imageUrl,
      mapX: s.mapX,
      mapY: s.mapY,
    }));

    const isTogether = await togetherByName(stopsAll);

    const courses: Course[] = [];
    for (const group of clusterByLocation(stopsAll, k)) {
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
    // withRoutes=false면 이 단계를 건너뛴다 — 경유지 정보만 쓰는 화면(성향 결과 등)에서
    // TMap/ODsay 호출로 빌드가 60초를 넘겨 실패하던 것을 막는다.
    if (withRoutes) try {
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
  const spots = (await getVerifiedNightSpots("ko")).filter((s) =>
    ids.includes(s.contentId),
  );
  return togetherByName(spots);
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
  contentIds: string[],
  locale = "ko",
  prefCategory?: NightSpot["category"],
): Promise<AiCourse | null> {
  // 지도에서 여러 곳을 담아 오면 전부 앵커 — 코스에 반드시 포함된다
  const anchors = (
    await Promise.all(contentIds.map((id) => getSpot(id, locale)))
  ).filter((s) => s !== null);
  if (!anchors.length) return null;
  const anchor = anchors[0];
  const anchorIds = new Set(anchors.map((a) => a.contentId));

  // 후보는 각 앵커 주변에서 모은다 (앵커가 많을수록 채울 자리는 줄어든다)
  const perAnchor = anchors.length > 1 ? 4 : 8;
  const nearLists = await Promise.all([
    ...anchors.map((a) => getNearbySpots(a.contentId, { limit: perAnchor, locale })),
    prefCategory
      ? getNearbySpots(anchor.contentId, { limit: 5, locale, category: prefCategory })
      : Promise.resolve([]),
  ]);
  // 거리순 후보 + 선호 카테고리 후보 (중복·앵커 제거, 가까운 순)
  const nearby = [...new Map(nearLists.flat().map((s) => [s.contentId, s])).values()]
    .filter((s) => !anchorIds.has(s.contentId))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 8);
  if (!nearby.length && anchors.length < 2) return null;

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
  anchors.forEach((a) => byId.set(a.contentId, toStop(a)));
  nearby.forEach((s) => byId.set(s.contentId, toStop(s)));

  // 후보 전체의 막차 정보 — 프롬프트에 넣어 "막차 전에 돌 수 있는 순서"를 짜게 한다
  const transitMap = await getTransitForSpots([...byId.keys()]);
  const lastBusOf = (id: string) => transitMap.get(id)?.lastBus ?? null;

  const anchorCandidates: CourseCandidate[] = anchors.map((a) => ({
    contentId: a.contentId,
    title: a.title,
    category: a.category,
    addr: a.addr,
    distanceM: 0,
    lastBus: lastBusOf(a.contentId),
  }));
  const candidates: CourseCandidate[] = nearby.map((s) => ({
    contentId: s.contentId,
    title: s.title,
    category: s.category,
    addr: s.addr,
    distanceM: s.distanceM,
    lastBus: lastBusOf(s.contentId),
  }));

  // 거리 기반 폴백 — 앵커들 + 가까운 곳으로 4곳을 채워 최단이웃 순서로
  const fallback = async (): Promise<AiCourse> => {
    const anchorStop = byId.get(anchor.contentId)!;
    const fill = Math.max(0, 4 - anchors.length);
    const stops = orderRoute(
      [...anchors.map(toStop), ...nearby.slice(0, fill).map(toStop)],
      anchorStop,
    );
    return {
      id: `ai-${anchors.map((a) => a.contentId).join("+")}`,
      anchorId: anchor.contentId,
      anchorIds: anchors.map((a) => a.contentId),
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
      anchorCandidates,
      candidates,
      locale,
      prefCategory,
    );

    // 후보에 없는 id·중복 제거 → 그래도 앵커는 전부 반드시 포함
    const seen = new Set<string>();
    const picked = plan.stops.filter((s) => {
      if (!byId.has(s.contentId) || seen.has(s.contentId)) return false;
      seen.add(s.contentId);
      return true;
    });
    for (const a of anchors) {
      if (!seen.has(a.contentId)) {
        picked.push({ contentId: a.contentId, note: "" });
        seen.add(a.contentId);
      }
    }
    if (picked.length < 2) return fallback();

    let stops = picked.map((p) => byId.get(p.contentId)!);
    let notes = picked.map((p) => p.note);

    // Gemini가 분위기 서사를 우선하다 동선을 무시하는 경우가 있다
    // (북→남→북 지그재그 실측). 최단이웃 순서보다 총 이동거리가 30% 이상
    // 길면 방문지 구성·설명은 그대로 두고 순서만 동선대로 고친다.
    const pathLen = (arr: CourseStop[]) => {
      let m = 0;
      for (let i = 0; i < arr.length - 1; i++) m += haversineM(arr[i], arr[i + 1]);
      return m;
    };
    const ordered = orderRoute([...stops], stops[0]);
    if (pathLen(stops) > pathLen(ordered) * 1.3) {
      const noteOf = new Map(stops.map((s, i) => [s.contentId, notes[i]]));
      stops = ordered;
      notes = ordered.map((s) => noteOf.get(s.contentId) ?? "");
    }

    return {
      id: `ai-${anchors.map((a) => a.contentId).join("+")}`,
      anchorId: anchor.contentId,
      anchorIds: anchors.map((a) => a.contentId),
      title: plan.title || anchor.title,
      summary: plan.summary,
      tip: plan.tip,
      notes,
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

/* ────────── 설문 기반 맞춤 코스 ────────── */

export type Transport = "walk" | "transit" | "taxi";
export type Companion = "solo" | "couple" | "friends" | "family";

export interface SurveyInput {
  /** 출발 좌표 (GPS 또는 고른 숙소·역) */
  mapX: number;
  mapY: number;
  /** "21:00" */
  startTime: string;
  durationMin: number;
  transport: Transport;
  companion: Companion;
  categories: NightSpot["category"][];
  locale: string;
  /** 혼잡도 조회 기준일 "YYYY-MM-DD" */
  date: string;
}

export interface SurveyStopInfo {
  /** 0~100, 100이 가장 붐빔. null이면 예측 데이터가 없는 곳 */
  congestion: number | null;
}

export interface SurveyCourse extends Course {
  title: string;
  summary: string;
  tip: string;
  notes: string[];
  transit: (SpotTransit | null)[];
  /** stops와 같은 순서 */
  info: SurveyStopInfo[];
  stays: NearbyStay[];
  source: "ai" | "distance";
  /** 실제로 적용된 조건 — 화면에 "왜 이 코스인지" 근거로 보여준다 */
  applied: {
    startTime: string;
    endTime: string;
    durationMin: number;
    transport: Transport;
    targetStops: number;
  };
}

/** 한 곳에 머무는 시간 — 야경은 보고 사진 찍으면 끝나므로 길게 잡지 않는다 */
const DWELL_MIN = 25;

/**
 * 이동 수단별 구간 평균 이동 시간(분).
 * spot_route 캐시 실측 평균(도보 48 · 대중교통 22 · 택시 8)을 기준으로 잡았다.
 */
const LEG_MIN: Record<Transport, number> = { walk: 45, transit: 22, taxi: 10 };

/**
 * 주어진 시간에 몇 곳을 돌 수 있는지.
 *   stops * 체류 + (stops-1) * 이동 <= 전체 시간
 * 산수라서 AI에 맡기지 않고 서버에서 정한 뒤 프롬프트에 못 박는다.
 */
export function planStopCount(durationMin: number, transport: Transport): number {
  const leg = LEG_MIN[transport];
  const n = Math.floor((durationMin + leg) / (DWELL_MIN + leg));
  return Math.min(5, Math.max(2, n));
}

/** "21:00" + 120분 → "23:00" (자정을 넘기면 그대로 24시 이상으로 표기하지 않고 감아준다) */
export function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h * 60 + m + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** 동행자에 따른 기본값 조정 — 동행자 자체는 데이터에 닿지 않으므로 다른 값으로 번역한다 */
const COMPANION_TWEAK: Record<Companion, { dwellBonus: number }> = {
  solo: { dwellBonus: 0 },
  couple: { dwellBonus: 5 }, // 한 곳에 더 머무름 → 곳 수는 줄어든다
  friends: { dwellBonus: 0 },
  family: { dwellBonus: 10 }, // 아이 동반은 이동이 느리다
};

/**
 * 설문 답변만으로 코스를 짠다 (앵커 없음).
 *
 * 답변이 프롬프트 양념으로만 쓰이지 않도록, 시간 예산은 서버가 계산해 방문지 수를
 * 정하고 이동 수단은 실제 경로 조회 모드로 이어진다. Gemini는 "그 안에서 무엇을
 * 어떤 순서로"만 정한다.
 */
export async function getSurveyCourse(
  input: SurveyInput,
): Promise<SurveyCourse | null> {
  const dwell = DWELL_MIN + COMPANION_TWEAK[input.companion].dwellBonus;
  const leg = LEG_MIN[input.transport];
  const targetStops = Math.min(
    5,
    Math.max(2, Math.floor((input.durationMin + leg) / (dwell + leg))),
  );
  const endTime = addMinutes(input.startTime, input.durationMin);

  // 후보는 출발지 주변에서 모은다. 선호 테마가 있으면 그 카테고리를 따로 더 담아
  // 거리순만으로 한 곳도 안 뽑히는 일을 막는다 (getAiCourse와 같은 방침).
  const [nearAll, nearPreferred] = await Promise.all([
    getSpotsNearPoint(input.mapX, input.mapY, { limit: 12, locale: input.locale }),
    input.categories.length
      ? getSpotsNearPoint(input.mapX, input.mapY, {
          limit: 8,
          categories: input.categories,
          locale: input.locale,
        })
      : Promise.resolve([]),
  ]);
  const candidateSpots = [
    ...new Map(
      [...nearPreferred, ...nearAll].map((s) => [s.contentId, s]),
    ).values(),
  ]
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 14);
  if (candidateSpots.length < 2) return null;

  const ids = candidateSpots.map((s) => s.contentId);
  const [transitMap, congestionMap] = await Promise.all([
    getTransitForSpots(ids),
    getCongestionForSpots(ids, input.date),
  ]);

  const toStop = (s: NightSpot): CourseStop => ({
    contentId: s.contentId,
    title: s.title,
    addr: s.addr,
    category: s.category,
    imageUrl: s.imageUrl,
    mapX: s.mapX,
    mapY: s.mapY,
  });
  const byId = new Map(candidateSpots.map((s) => [s.contentId, toStop(s)]));

  const finish = async (
    stops: CourseStop[],
    plan: { title: string; summary: string; tip: string; notes: string[] },
    source: "ai" | "distance",
  ): Promise<SurveyCourse> => {
    const base = await toCourse(stops, true);
    const stays = await staysNearLastStop(stops);
    return {
      id: `survey-${stops.map((s) => s.contentId).join("+")}`,
      ...base,
      ...plan,
      transit: stops.map((s) => transitMap.get(s.contentId) ?? null),
      info: stops.map((s) => ({
        congestion: congestionMap.get(s.contentId) ?? null,
      })),
      stays,
      source,
      applied: {
        startTime: input.startTime,
        endTime,
        durationMin: input.durationMin,
        transport: input.transport,
        targetStops,
      },
    };
  };

  // 폴백 — 출발지에서 가까운 순으로 채우고 최단이웃 순서로 잇는다
  const fallback = () =>
    finish(
      orderRoute(candidateSpots.slice(0, targetStops).map(toStop)),
      {
        title: "",
        summary: "",
        tip: "",
        notes: Array(targetStops).fill(""),
      },
      "distance",
    );

  try {
    const plan = await generateSurveyCourse(
      candidateSpots.map((s) => ({
        contentId: s.contentId,
        title: s.title,
        category: s.category,
        addr: s.addr,
        distanceM: s.distanceM,
        lastBus: transitMap.get(s.contentId)?.lastBus ?? null,
        congestion: congestionMap.get(s.contentId) ?? null,
      })),
      {
        startTime: input.startTime,
        durationMin: input.durationMin,
        endTime,
        transport: input.transport,
        companion: input.companion,
        targetStops,
      },
      input.locale,
      input.categories,
    );

    // 환각 방지 — 후보에 없는 id는 버린다
    const picked = plan.stops
      .map((s) => ({ stop: byId.get(s.contentId), note: s.note }))
      .filter((s): s is { stop: CourseStop; note: string } => !!s.stop);
    const unique = [
      ...new Map(picked.map((p) => [p.stop.contentId, p])).values(),
    ];
    if (unique.length < 2) return fallback();

    return finish(
      unique.map((p) => p.stop),
      {
        title: plan.title,
        summary: plan.summary,
        tip: plan.tip,
        notes: unique.map((p) => p.note),
      },
      "ai",
    );
  } catch (err) {
    console.warn(
      "[courses] 설문 코스 생성 실패 — 거리 기반으로 대체합니다:",
      err instanceof Error ? err.message : err,
    );
    return fallback();
  }
}
