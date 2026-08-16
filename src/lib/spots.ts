import { sql } from "./db";
import { MOCK_NIGHT_SPOTS, type NightSpot } from "./kto";

/**
 * 야간 검증(night_verified) 완료된 스팟만 조회 — 홈 화면 데이터 소스
 * locale을 주면 KTO 다국어 관광정보 서비스의 공식 번역 명칭으로 표시한다.
 */
export async function getVerifiedNightSpots(locale = "ko"): Promise<NightSpot[]> {
  try {
    const rows = await sql<SpotRow[]>`
      select s.content_id, coalesce(tr.title, s.title) as title, s.addr, s.category, s.image_url,
             st_x(s.geom) as map_x, st_y(s.geom) as map_y,
             nullif(trim(tr.overview), '') as official_overview
      from night_spots s
      left join spot_translations tr
        on tr.content_id = s.content_id and tr.locale = ${locale}
      where s.night_verified = true
        and s.image_url is not null -- 사진 있는 스팟만 노출 (팀 방침)
      order by s.category, s.title
    `;
    return rows.map(toSpot);
  } catch (err) {
    // DB 미설정/연결 실패 시 큐레이션 목 데이터로 폴백 (로컬 개발·UI 테스트용).
    // 실서버에선 DB가 정상이므로 발동하지 않으며, 발동 시 경고 로그를 남긴다.
    console.warn(
      "[spots] DB 조회 실패 — 목 데이터로 폴백합니다:",
      err instanceof Error ? err.message : err,
    );
    return MOCK_NIGHT_SPOTS;
  }
}

interface SpotRow {
  content_id: string;
  title: string;
  addr: string;
  category: string;
  image_url: string | null;
  map_x: number;
  map_y: number;
  dist_m?: number;
  official_overview?: string | null;
}

function toSpot(r: SpotRow): NightSpot {
  return {
    contentId: r.content_id,
    title: r.title,
    addr: r.addr,
    mapX: r.map_x,
    mapY: r.map_y,
    imageUrl: r.image_url,
    category: r.category as NightSpot["category"],
    overview: r.official_overview ?? null,
  };
}

/**
 * 축제·행사 명소만 추린다.
 *
 * 별도 축제 데이터는 두지 않는다 — 축제 일정(개최일)을 주는 출처는 KTO
 * searchFestival2인데 키가 막혀 있어, 없는 일정을 지어내느니 야간 명소로 검증된
 * 축제장만 장소로서 보여준다. 검증 목록을 그대로 걸러 쓰므로 번역·소개문·사진이
 * 모두 갖춰진 것만 올라온다.
 */
export function pickFestivals(spots: NightSpot[]): NightSpot[] {
  return spots.filter((s) => s.category === "festival");
}

export interface SpotDetail extends NightSpot {
  /** KTO 다국어 서비스의 공식 소개문 (없으면 null → Gemini 가이드가 대신함) */
  officialOverview: string | null;
}

/** 상세 페이지용 단건 조회 — 공식 번역 명칭·소개문 포함 */
export async function getSpot(
  contentId: string,
  locale = "ko",
): Promise<SpotDetail | null> {
  const rows = await sql<SpotRow[]>`
    select s.content_id, coalesce(tr.title, s.title) as title, s.addr, s.category, s.image_url,
           st_x(s.geom) as map_x, st_y(s.geom) as map_y,
           nullif(trim(tr.overview), '') as official_overview
    from night_spots s
    left join spot_translations tr
      on tr.content_id = s.content_id and tr.locale = ${locale}
    where s.content_id = ${contentId} and s.night_verified = true
  `;
  if (!rows.length) return null;
  return { ...toSpot(rows[0]), officialOverview: rows[0].official_overview ?? null };
}

/**
 * 임의 좌표 주변의 검증 스팟 (거리순).
 *
 * getNearbySpots는 기준이 '다른 스팟'이라 앵커가 있어야 한다. 설문 코스는 사용자의
 * 현재 위치·숙소에서 출발하므로 좌표만으로 찾을 수 있어야 한다.
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
  const rows = await sql<SpotRow[]>`
    select s.content_id, coalesce(tr.title, s.title) as title, s.addr, s.category, s.image_url,
           st_x(s.geom) as map_x, st_y(s.geom) as map_y,
           nullif(trim(tr.overview), '') as official_overview,
           round(st_distance(
             s.geom::geography,
             st_setsrid(st_makepoint(${mapX}, ${mapY}), 4326)::geography
           )) as dist_m
    from night_spots s
    left join spot_translations tr
      on tr.content_id = s.content_id and tr.locale = ${locale}
    where s.night_verified = true
      and s.image_url is not null
      ${categories?.length ? sql`and s.category = any(${categories})` : sql``}
    order by dist_m
    limit ${limit}
  `;
  return rows.map((r) => ({ ...toSpot(r), distanceM: Number(r.dist_m) }));
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

export interface NearbySpot extends NightSpot {
  distanceM: number;
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
  const rows = await sql<SpotRow[]>`
    select s.content_id, coalesce(tr.title, s.title) as title, s.addr, s.category, s.image_url,
           st_x(s.geom) as map_x, st_y(s.geom) as map_y,
           round(st_distance(s.geom::geography, base.geom::geography)) as dist_m
    from night_spots s
    cross join (select geom from night_spots where content_id = ${contentId}) base
    left join spot_translations tr
      on tr.content_id = s.content_id and tr.locale = ${locale}
    where s.night_verified = true
      and s.image_url is not null
      and s.content_id != ${contentId}
      ${category ? sql`and s.category = ${category}` : sql``}
    order by dist_m
    limit ${limit}
  `;
  return rows.map((r) => ({ ...toSpot(r), distanceM: Number(r.dist_m) }));
}
