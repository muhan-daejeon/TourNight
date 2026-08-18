import { sql } from "./db";
import { MOCK_NIGHT_SPOTS, type NightSpot } from "./kto";
import { getKtoSpots, getKtoOverview, type KtoSpot } from "./kto-live";

/**
 * 야간 명소 조회 — KTO 원천 정보는 실시간, 우리 판단은 DB.
 *
 * 공사가 로컬 DB 적재 대신 실시간 호출을 권고하므로, 이름·주소·좌표·사진 같은
 * 원천 정보는 저장하지 않고 요청 시점에 KTO에서 받는다(kto-live). DB의
 * night_spots에는 KTO에 없는 것만 남는다 — 야간 검수 결과(night_verified),
 * 우리가 매긴 카테고리, 그리고 KTO 미등재 수동 큐레이션 명소(mock-).
 */

/** DB에 남는 우리 판단 — KTO 원천 데이터가 아니다 */
interface VerdictRow {
  content_id: string;
  category: string;
  night_verified: boolean;
  /** KTO 미등재 수동 큐레이션 명소는 원천을 받을 수 없어 자체 정보를 쓴다 */
  title: string | null;
  addr: string | null;
  image_url: string | null;
  map_x: number | null;
  map_y: number | null;
}

interface Verdict {
  category: NightSpot["category"];
  verified: boolean;
  manual: NightSpot | null;
}

/** 검수 결과를 contentId로 찾을 수 있게 (KTO 미등재 명소는 자체 정보 포함) */
async function getVerdicts(): Promise<Map<string, Verdict>> {
  const rows = await sql<VerdictRow[]>`
    select content_id, category, night_verified, title, addr, image_url,
           st_x(geom) as map_x, st_y(geom) as map_y
    from night_spots
  `;
  return new Map(
    rows.map((r) => [
      r.content_id,
      {
        category: r.category as NightSpot["category"],
        verified: r.night_verified,
        // KTO에 없는 곳(mock-)은 실시간으로 받을 수 없으므로 저장분을 그대로 쓴다
        manual: r.content_id.startsWith("mock-")
          ? {
              contentId: r.content_id,
              title: r.title ?? "",
              addr: r.addr ?? "",
              mapX: Number(r.map_x),
              mapY: Number(r.map_y),
              imageUrl: r.image_url,
              category: r.category as NightSpot["category"],
            }
          : null,
      },
    ]),
  );
}

const merge = (k: KtoSpot, v: Verdict): NightSpot => ({
  contentId: k.contentId,
  title: k.title,
  addr: k.addr,
  mapX: k.mapX,
  mapY: k.mapY,
  imageUrl: k.imageUrl,
  category: v.category,
});

/**
 * 검수를 통과한 야간 명소 (홈·지도·코스의 공통 데이터 소스).
 * KTO 실시간 목록과 우리 검수 결과를 맞춰, 통과 + 사진 있는 곳만 돌려준다.
 */
export async function getVerifiedNightSpots(locale = "ko"): Promise<NightSpot[]> {
  try {
    const [ktoSpots, verdicts] = await Promise.all([
      getKtoSpots(locale),
      getVerdicts(),
    ]);

    const out: NightSpot[] = [];
    for (const k of ktoSpots) {
      const v = verdicts.get(k.contentId);
      if (!v?.verified || !k.imageUrl) continue; // 사진 있는 검수 통과분만 (팀 방침)
      out.push(merge(k, v));
    }
    // KTO 미등재 수동 큐레이션 명소 (국립중앙과학관 등)
    for (const v of verdicts.values()) {
      if (v.verified && v.manual?.imageUrl) out.push(v.manual);
    }

    out.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
    return out;
  } catch (err) {
    // KTO 장애·DB 장애 시 큐레이션 목 데이터로 폴백 (화면이 비지 않게)
    console.warn(
      "[spots] 실시간 조회 실패 — 목 데이터로 폴백합니다:",
      err instanceof Error ? err.message : err,
    );
    return MOCK_NIGHT_SPOTS;
  }
}

export function pickFestivals(spots: NightSpot[]): NightSpot[] {
  return spots.filter((s) => s.category === "festival");
}

export interface SpotDetail extends NightSpot {
  /** KTO 공식 소개문 (없으면 null → Gemini 가이드가 대신함) */
  officialOverview: string | null;
}

/** 상세 페이지용 단건 조회 — 소개문도 실시간으로 받는다 */
export async function getSpot(
  contentId: string,
  locale = "ko",
): Promise<SpotDetail | null> {
  const spots = await getVerifiedNightSpots(locale);
  const spot = spots.find((s) => s.contentId === contentId);
  if (!spot) return null;

  // 수동 큐레이션 명소는 KTO에 없어 소개문도 없다 (Gemini 가이드가 채운다)
  if (contentId.startsWith("mock-")) {
    return { ...spot, officialOverview: null };
  }
  try {
    const overview = await getKtoOverview(contentId, locale);
    return { ...spot, officialOverview: overview || null };
  } catch {
    return { ...spot, officialOverview: null };
  }
}

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** 두 좌표 사이 거리(m) — PostGIS 대신 메모리에서 계산한다 */
function distanceM(
  a: { mapX: number; mapY: number },
  b: { mapX: number; mapY: number },
): number {
  const dLat = rad(b.mapY - a.mapY);
  const dLng = rad(b.mapX - a.mapX);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.mapY)) * Math.cos(rad(b.mapY)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export interface NearbySpot extends NightSpot {
  distanceM: number;
}

/**
 * 임의 좌표 주변의 검증 스팟 (거리순).
 * 설문 코스는 사용자의 현재 위치·숙소에서 출발하므로 좌표만으로 찾을 수 있어야 한다.
 */
export async function getSpotsNearPoint(
  mapX: number,
  mapY: number,
  {
    limit = 12,
    categories,
    locale = "ko",
  }: {
    limit?: number;
    /** 비우면 전체 카테고리 */
    categories?: NightSpot["category"][];
    locale?: string;
  } = {},
): Promise<NearbySpot[]> {
  const spots = await getVerifiedNightSpots(locale);
  return spots
    .filter((s) => !categories?.length || categories.includes(s.category))
    .map((s) => ({ ...s, distanceM: distanceM({ mapX, mapY }, s) }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit);
}

/** 인근 검증 스팟 (거리순). category를 주면 해당 카테고리만 */
export async function getNearbySpots(
  contentId: string,
  {
    category,
    limit = 4,
    locale = "ko",
  }: {
    category?: NightSpot["category"];
    limit?: number;
    locale?: string;
  } = {},
): Promise<NearbySpot[]> {
  const spots = await getVerifiedNightSpots(locale);
  const base = spots.find((s) => s.contentId === contentId);
  if (!base) return [];
  return spots
    .filter((s) => s.contentId !== contentId)
    .filter((s) => !category || s.category === category)
    .map((s) => ({ ...s, distanceM: distanceM(base, s) }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit);
}

/**
 * 여러 스팟의 특정 날짜 혼잡도 (0~100, 100이 가장 붐빔).
 *
 * 한국관광공사 관광지 집중률(KT 통신데이터) 예측이라 실시간이 아니고 '일자' 단위다.
 * 데이터가 없는 스팟은 맵에서 빠진다 — 없는 것을 '한산함'으로 읽으면 안 되므로
 * 호출부에서 '정보 없음'과 구분해 표시해야 한다.
 */
export async function getCongestionForSpots(
  contentIds: string[],
  date: string,
): Promise<Map<string, number>> {
  if (!contentIds.length) return new Map();
  try {
    const rows = await sql<{ content_id: string; rate: string }[]>`
      select content_id, rate from spot_congestion
      where content_id = any(${contentIds}) and base_ymd = ${date}
    `;
    return new Map(rows.map((r) => [r.content_id, Math.round(Number(r.rate))]));
  } catch (err) {
    console.warn(
      "[spots] 혼잡도 조회 실패:",
      err instanceof Error ? err.message : err,
    );
    return new Map();
  }
}

export interface CongestionDay {
  date: string; // YYYY-MM-DD
  rate: number; // 0~100 상대 집중률
}

/** 향후 7일 혼잡도 예측 (KT 통신데이터 기반, 데이터 없는 스팟은 빈 배열) */
export async function getCongestion(contentId: string): Promise<CongestionDay[]> {
  const rows = await sql<{ date: string; rate: string }[]>`
    select to_char(base_ymd, 'YYYY-MM-DD') as date, rate
    from spot_congestion
    where content_id = ${contentId}
      and base_ymd >= current_date and base_ymd < current_date + 7
    order by base_ymd
  `;
  return rows.map((r) => ({ date: r.date, rate: Number(r.rate) }));
}
