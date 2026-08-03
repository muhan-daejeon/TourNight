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

  return rows.map((r) => ({
    contentId: r.content_id,
    title: r.title,
    addr: r.addr,
    mapX: r.map_x,
    mapY: r.map_y,
    imageUrl: r.image_url,
    category: r.category as NightSpot["category"],
  }));
}
