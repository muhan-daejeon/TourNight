import { sql } from "./db";
import type { NightSpot } from "./kto";

/** 야간 검증(night_verified) 완료된 스팟만 조회 — 홈 화면 데이터 소스 */
export async function getVerifiedNightSpots(): Promise<NightSpot[]> {
  const rows = await sql<
    {
      content_id: string;
      title: string;
      addr: string;
      category: string;
      image_url: string | null;
      map_x: number;
      map_y: number;
    }[]
  >`
    select content_id, title, addr, category, image_url,
           st_x(geom) as map_x, st_y(geom) as map_y
    from night_spots
    where night_verified = true
      and image_url is not null -- 사진 있는 스팟만 노출 (팀 방침)
    order by category, title
  `;

  return rows.map(toSpot);
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

/** 상세 페이지용 단건 조회 (검증 여부 무관 — 직링크 대응은 검증된 것만) */
export async function getSpot(contentId: string): Promise<NightSpot | null> {
  const rows = await sql<SpotRow[]>`
    select content_id, title, addr, category, image_url,
           st_x(geom) as map_x, st_y(geom) as map_y
    from night_spots
    where content_id = ${contentId} and night_verified = true
  `;
  return rows.length ? toSpot(rows[0]) : null;
}

export interface NearbySpot extends NightSpot {
  distanceM: number;
}

/** 인근 검증 스팟 (거리순). natureOnly면 자연 카테고리만 */
export async function getNearbySpots(
  contentId: string,
  { natureOnly = false, limit = 4 }: { natureOnly?: boolean; limit?: number } = {},
): Promise<NearbySpot[]> {
  const rows = await sql<SpotRow[]>`
    select s.content_id, s.title, s.addr, s.category, s.image_url,
           st_x(s.geom) as map_x, st_y(s.geom) as map_y,
           round(st_distance(s.geom::geography, base.geom::geography)) as dist_m
    from night_spots s,
         (select geom from night_spots where content_id = ${contentId}) base
    where s.night_verified = true
      and s.image_url is not null
      and s.content_id != ${contentId}
      ${natureOnly ? sql`and s.category = 'nature'` : sql``}
    order by dist_m
    limit ${limit}
  `;
  return rows.map((r) => ({ ...toSpot(r), distanceM: Number(r.dist_m) }));
}
