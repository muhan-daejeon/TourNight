import { sql } from "./db";
import { MOCK_NIGHT_SPOTS, type NightSpot } from "./kto";
import { getKtoSpots, getKtoOverview, type KtoSpot } from "./kto-live";
import { getCongestionRows, normName } from "./kto-stats";

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
  /** 공사 다국어판이 없어 우리가 채운 이름 */
  saved_title: string | null;
  addr: string | null;
  image_url: string | null;
  map_x: number | null;
  map_y: number | null;
}

interface Verdict {
  category: NightSpot["category"];
  verified: boolean;
  manual: NightSpot | null;
  /** 공사에 다국어판이 없어 우리가 채운 이름 (없으면 null) */
  savedTitle: string | null;
}

/** 검수 결과를 contentId로 찾을 수 있게 (KTO 미등재 명소는 자체 정보 포함) */
async function getVerdicts(locale: string): Promise<Map<string, Verdict>> {
  // KTO에 있는 곳은 판정만 읽는다. title·addr·좌표는 실시간으로 받으므로
  // 저장분이 필요 없고, KTO 미등재 수동 명소(mock-)만 우리 정보를 쓴다.
  // 그 수동 명소의 외국어 이름은 KTO에 없어 우리가 직접 넣어 둔 번역을 쓴다.
  const rows = await sql<VerdictRow[]>`
    select s.content_id, s.category, s.night_verified,
           coalesce(tr.title, s.title) as title, tr.title as saved_title,
           s.addr, s.image_url,
           st_x(s.geom) as map_x, st_y(s.geom) as map_y
    from night_spots s
    left join spot_translations tr
      on tr.content_id = s.content_id and tr.locale = ${locale}
    where s.night_verified = true
  `;
  return new Map(
    rows.map((r) => [
      r.content_id,
      {
        category: r.category as NightSpot["category"],
        verified: r.night_verified,
        savedTitle: r.saved_title ?? null,
        // KTO에 없는 곳(mock-)은 실시간으로 받을 수 없으므로 저장분을 그대로 쓴다.
        // content_id가 빠진 불량 행이 있어도 전체 조회가 죽지 않도록 널 방어한다.
        manual: r.content_id?.startsWith("mock-")
          ? {
              contentId: r.content_id,
              title: r.title ?? "",
              addr: r.addr ?? "",
              addrKo: r.addr ?? "",
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

/** 공사 다국어판이 없어 이름이 한글 그대로인지 */
const untranslated = (title: string, locale: string) =>
  locale !== "ko" && /[가-힣]/.test(title);

const merge = (k: KtoSpot, v: Verdict, addrKo: string, locale: string): NightSpot => ({
  contentId: k.contentId,
  title: untranslated(k.title, locale) ? (v.savedTitle ?? k.title) : k.title,
  addr: k.addr,
  addrKo: addrKo || k.addr,
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
    // 자치구를 뽑아 쓰는 곳(방문객 통계·해시태그)이 한글 주소를 정규식으로 찾으므로
    // 다른 언어를 볼 때도 한국어 주소를 함께 싣는다. 같은 캐시를 재사용해 비용은 없다.
    const [ktoSpots, koSpots, verdicts] = await Promise.all([
      getKtoSpots(locale),
      locale === "ko" ? Promise.resolve(null) : getKtoSpots("ko"),
      getVerdicts(locale),
    ]);
    const addrKoById = new Map(
      (koSpots ?? []).map((s) => [s.contentId, s.addr]),
    );

    const out: NightSpot[] = [];
    for (const k of ktoSpots) {
      const v = verdicts.get(k.contentId);
      if (!v?.verified || !k.imageUrl) continue; // 사진 있는 검수 통과분만 (팀 방침)
      out.push(merge(k, v, addrKoById.get(k.contentId) ?? k.addr, locale));
    }
    // KTO 미등재 수동 큐레이션 명소 (국립중앙과학관 등)
    for (const v of verdicts.values()) {
      if (v.verified && v.manual?.imageUrl) out.push(v.manual);
    }

    // 공사에도 없고 우리 저장분에도 없는 이름은 뒤에서 번역해 둔다.
    // 이번 응답을 붙잡아 두면 첫 방문이 느려지고 빌드가 타임아웃되므로 기다리지 않는다.
    fillMissingTitles(out, locale);

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

/**
 * 아직 번역이 없는 이름을 AI로 채워 다음 요청부터 쓰이게 한다.
 *
 * 화면을 기다리게 하지 않으려고 결과를 기다리지 않는다(fire-and-forget).
 * 같은 이름을 두 번 부르지 않도록 진행 중인 언어는 표시해 둔다.
 */
const filling = new Set<string>();

function fillMissingTitles(spots: NightSpot[], locale: string): void {
  if (locale === "ko" || filling.has(locale)) return;
  const missing = spots.filter((s) => /[가-힣]/.test(s.title));
  if (missing.length === 0) return;

  filling.add(locale);
  void (async () => {
    try {
      const { translateSpotTitles } = await import("./gemini");
      const byKo = new Map(missing.map((s) => [s.title, s.contentId]));
      const translated = await translateSpotTitles([...byKo.keys()], locale);

      for (const [ko, title] of Object.entries(translated)) {
        const contentId = byKo.get(ko);
        if (!contentId) continue;
        await sql`
          insert into spot_translations (content_id, locale, title, source)
          values (${contentId}, ${locale}, ${title}, 'ai')
          on conflict (content_id, locale) do update
            set title = excluded.title, source = 'ai', updated_at = now()
        `;
      }
      console.log(
        `[spots] ${locale} 이름 ${Object.keys(translated).length}건 번역해 저장했습니다`,
      );
    } catch (err) {
      console.warn(
        "[spots] 이름 번역 실패:",
        err instanceof Error ? err.message : err,
      );
    } finally {
      filling.delete(locale);
    }
  })();
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
    // 집중률 API는 contentId가 아니라 관광지명으로 응답한다 → 이름으로 맞춘다
    const [rows, spots] = await Promise.all([
      getCongestionRows(),
      getVerifiedNightSpots("ko"),
    ]);
    const idByName = new Map(spots.map((s) => [normName(s.title), s.contentId]));
    const wanted = new Set(contentIds);
    const ymd = date.replace(/-/g, "");

    const out = new Map<string, number>();
    for (const r of rows) {
      if (r.baseYmd !== ymd) continue;
      const id = idByName.get(normName(r.tAtsNm));
      if (id && wanted.has(id)) out.set(id, Math.round(Number(r.cnctrRate)));
    }
    return out;
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
  try {
    const [rows, spots] = await Promise.all([
      getCongestionRows(),
      getVerifiedNightSpots("ko"),
    ]);
    const title = spots.find((s) => s.contentId === contentId)?.title;
    if (!title) return [];

    const key = normName(title);
    const today = new Date();
    const from = todayYmd(today);
    const to = todayYmd(new Date(today.getTime() + 7 * 24 * 3600 * 1000));

    return rows
      .filter((r) => normName(r.tAtsNm) === key)
      .filter((r) => r.baseYmd >= from && r.baseYmd < to)
      .sort((a, b) => a.baseYmd.localeCompare(b.baseYmd))
      .map((r) => ({ date: dashed(r.baseYmd), rate: Number(r.cnctrRate) }));
  } catch (err) {
    console.warn(
      "[spots] 혼잡도 조회 실패:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

const todayYmd = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

/** YYYYMMDD → YYYY-MM-DD */
const dashed = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
