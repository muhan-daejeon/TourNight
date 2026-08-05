import { NextRequest, NextResponse } from "next/server";
import {
  generateEtiquette,
  ETIQUETTE_TOPICS,
  type EtiquetteGuide,
} from "@/lib/gemini";
import { sql } from "@/lib/db";
import { routing } from "@/i18n/routing";

/** 주제별 관련 야간 명소 — 에티켓에서 명소 탐색으로 이어지는 동선 */
const TOPIC_SPOT_FILTER: Record<string, { categories?: string[]; titles?: string[] }> = {
  festival: { categories: ["festival"] },
  nature: { categories: ["nature"] },
  oncheon: { titles: ["유성온천지구", "유성 족욕체험장", "유성 관광특구"] },
  pojangmacha: { titles: ["으능정이문화의거리", "스카이로드", "도마큰시장"] },
  dining: { titles: ["대흥동 문화예술의거리", "소제동", "으능정이문화의거리"] },
  noraebang: { titles: ["으능정이문화의거리", "유성온천지구"] },
  latefood: { titles: ["도마큰시장", "소제동", "으능정이문화의거리"] },
};

interface RelatedSpot {
  contentId: string;
  title: string;
  imageUrl: string | null;
  category: string;
}

async function relatedSpots(topicId: string, locale: string): Promise<RelatedSpot[]> {
  const filter = TOPIC_SPOT_FILTER[topicId];
  if (!filter) return [];
  const rows = await sql<
    { content_id: string; title: string; image_url: string | null; category: string }[]
  >`
    select s.content_id, coalesce(tr.title, s.title) as title, s.image_url, s.category
    from night_spots s
    left join spot_translations tr
      on tr.content_id = s.content_id and tr.locale = ${locale}
    where s.night_verified = true and s.image_url is not null
      and (
        ${filter.categories ? sql`s.category = any(${filter.categories})` : sql`false`}
        or ${filter.titles ? sql`s.title = any(${filter.titles})` : sql`false`}
      )
    limit 3
  `;
  return rows.map((r) => ({
    contentId: r.content_id,
    title: r.title,
    imageUrl: r.image_url,
    category: r.category,
  }));
}

export async function GET(request: NextRequest) {
  const topicId = request.nextUrl.searchParams.get("topic") ?? "";
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";

  if (!(topicId in ETIQUETTE_TOPICS) || !routing.locales.includes(locale as never)) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const spots = await relatedSpots(topicId, locale);

  const cached = await sql<{ content: string }[]>`
    select content from etiquette_cache
    where topic_id = ${topicId} and locale = ${locale}
  `;
  if (cached.length > 0) {
    try {
      const guide: EtiquetteGuide = JSON.parse(cached[0].content);
      return NextResponse.json({ ...guide, spots });
    } catch {
      // 구형(줄글) 캐시면 아래에서 재생성
    }
  }

  try {
    const guide = await generateEtiquette(topicId, locale);
    await sql`
      insert into etiquette_cache (topic_id, locale, content)
      values (${topicId}, ${locale}, ${JSON.stringify(guide)})
      on conflict (topic_id, locale)
      do update set content = excluded.content, updated_at = now()
    `;
    return NextResponse.json({ ...guide, spots });
  } catch {
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
