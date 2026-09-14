import { sql } from "./db";
import type { NightSpot } from "./kto";
import { getDaejeonFestivals, todayKst, type FestivalPeriod } from "./kto-live";
import { fillMissingTitles } from "./spots";

/** 화면에 세우는 축제는 둘뿐이다 — 지금 하는 것과 앞으로 할 것 */
export type FestivalStatus = "ongoing" | "upcoming";

export interface FestivalWithPeriod extends NightSpot {
  period: FestivalPeriod;
  status: FestivalStatus;
  /** 예정이면 며칠 남았는지, 진행 중이면 null */
  daysUntil: number | null;
}

/** "20260917" → Date. 시차를 타지 않도록 로컬 자정으로 만든다 */
const parseYmd = (s: string) =>
  new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));

const daysBetween = (from: string, to: string) =>
  Math.round((parseYmd(to).getTime() - parseYmd(from).getTime()) / 86400000);

/**
 * 우리가 채워 둔 축제 이름 번역. 공사 다국어 서비스에는 대전 축제가 거의 없어
 * (영문 1곳) 국문 목록을 받아 쓰는데, 그러면 이름이 한글로 남는다. 명소와 같은
 * spot_translations를 쓰므로 이미 번역된 축제는 그대로 재사용된다.
 */
async function savedTitles(
  contentIds: string[],
  locale: string,
): Promise<Map<string, string>> {
  if (locale === "ko" || contentIds.length === 0) return new Map();
  try {
    const rows = await sql<{ content_id: string; title: string }[]>`
      select content_id, title
      from spot_translations
      where locale = ${locale} and content_id = any(${contentIds})
    `;
    return new Map(rows.map((r) => [r.content_id, r.title]));
  } catch {
    // 번역은 부가 정보다 — 못 읽어도 한글 이름으로 축제는 띄운다
    return new Map();
  }
}

/**
 * 오늘 기준 진행 중이거나 앞으로 열릴 대전 축제.
 *
 * 끝난 축제는 아예 받아오지 않는다 — searchFestival2에 오늘을 넣으면 그날까지
 * 열려 있는 것만 오기 때문이다. 그래서 화면 쪽에서 따로 거를 필요가 없다.
 *
 * 정렬은 진행 중 → 예정(가까운 순). 축제 목록은 부가 화면이므로 조회가
 * 실패해도 던지지 않고 빈 목록을 준다 (홈이 통째로 500이 나는 것보다 낫다).
 */
export async function getUpcomingFestivals(
  locale = "ko",
): Promise<FestivalWithPeriod[]> {
  const today = todayKst();

  let rows;
  try {
    rows = await getDaejeonFestivals(today);
  } catch (err) {
    console.warn(
      "[festivals] 축제 조회 실패 — 빈 목록으로 넘깁니다:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }

  const translated = await savedTitles(
    rows.map((r) => r.contentId),
    locale,
  );

  const out: FestivalWithPeriod[] = rows
    // 공사가 늦게 내린 값에 대비한 안전망 — 이미 끝난 것은 세우지 않는다
    .filter((r) => r.period.end >= today)
    .map((r) => {
      const upcoming = today < r.period.start;
      return {
        contentId: r.contentId,
        title: translated.get(r.contentId) ?? r.title,
        addr: r.addr,
        addrKo: r.addr,
        mapX: r.mapX,
        mapY: r.mapY,
        imageUrl: r.imageUrl,
        category: "festival" as const,
        period: r.period,
        status: (upcoming ? "upcoming" : "ongoing") as FestivalStatus,
        daysUntil: upcoming ? daysBetween(today, r.period.start) : null,
      };
    });

  // 아직 번역이 없는 이름은 뒤에서 채워 다음 방문부터 쓰이게 한다 (기다리지 않는다)
  fillMissingTitles(out, locale);

  return out.sort((a, b) => {
    if (a.status !== b.status) return a.status === "ongoing" ? -1 : 1;
    // 진행 중은 먼저 끝나는 것부터, 예정은 먼저 시작하는 것부터
    return a.status === "ongoing"
      ? a.period.end.localeCompare(b.period.end)
      : a.period.start.localeCompare(b.period.start);
  });
}
