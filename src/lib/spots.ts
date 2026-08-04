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
             st_x(s.geom) as map_x, st_y(s.geom) as map_y
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
  };
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

/** 인근 검증 스팟 (거리순). natureOnly면 자연 카테고리만 */
export async function getNearbySpots(
  contentId: string,
  {
    natureOnly = false,
    limit = 4,
    locale = "ko",
  }: { natureOnly?: boolean; limit?: number; locale?: string } = {},
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
      ${natureOnly ? sql`and s.category = 'nature'` : sql``}
    order by dist_m
    limit ${limit}
  `;
  return rows.map((r) => ({ ...toSpot(r), distanceM: Number(r.dist_m) }));
}
