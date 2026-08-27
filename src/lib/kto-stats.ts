import { unstable_cache } from "next/cache";
import { SERVICE_NAME } from "./kto";
import { readApiCache, writeApiCache } from "./api-cache";

/**
 * KTO 관광통계 실시간 조회 레이어.
 *
 * 집중률·방문객수·연관관광지도 명소 원천정보(kto-live)와 같은 원칙으로 다룬다 —
 * DB에 적재하지 않고 요청 시점에 API로 받는다. 통계는 명소 목록보다 갱신이
 * 훨씬 느리므로(집중률 일 단위, 방문객 일 단위, 연관 월 단위) 캐시는 더 길게 잡는다.
 *
 * 이름 매칭이 필요한 이유: 통계 API들은 contentId가 아니라 관광지 이름(tAtsNm)으로
 * 응답한다. 그래서 우리 명소 제목과 이름으로 맞춰야 한다.
 */

const BASE = "https://apis.data.go.kr/B551011";
const AREA_CD = "30"; // 대전
const SIGNGU_CODES = ["30110", "30140", "30170", "30200", "30230"]; // 동·중·서·유성·대덕
const TIMEOUT_MS = 20000;

/** 이름 매칭용 정규화 — 공백·괄호·가운뎃점을 지우고 소문자로 */
export const normName = (s: string) =>
  (s ?? "").replace(/\s+/g, "").replace(/[()（）·]/g, "").toLowerCase();

function params(extra: Record<string, string>) {
  return new URLSearchParams({
    serviceKey: process.env.KTO_API_KEY ?? "",
    MobileOS: "ETC",
    MobileApp: SERVICE_NAME,
    _type: "json",
    numOfRows: "1000",
    ...extra,
  });
}

/** 한 오퍼레이션을 페이지 끝까지 훑는다 */
async function callAll<T>(
  path: string,
  extra: Record<string, string>,
  maxPages = 5,
): Promise<T[]> {
  const cacheKey = `${path}?${new URLSearchParams(extra)}`;
  try {
    const out = await callAllPages<T>(path, extra, maxPages);
    writeApiCache(cacheKey, out);
    return out;
  } catch (err) {
    const cached = await readApiCache<T[]>(cacheKey);
    if (cached) {
      console.warn(`[kto-stats] ${path} 실패 → 보관분 사용:`, err instanceof Error ? err.message : err);
      return cached;
    }
    throw err;
  }
}

async function callAllPages<T>(
  path: string,
  extra: Record<string, string>,
  maxPages: number,
): Promise<T[]> {
  const out: T[] = [];
  let total = Infinity;
  for (let page = 1; page <= maxPages && out.length < total; page++) {
    const res = await fetch(
      `${BASE}/${path}?${params({ ...extra, pageNo: String(page) })}`,
      {
        // 통계는 하루 단위로만 바뀐다. 파일 캐시라 빌드 워커끼리 공유된다
        signal: AbortSignal.timeout(TIMEOUT_MS),
        next: { revalidate: 21600, tags: ["kto-stats"] },
      },
    );
    if (!res.ok) throw new Error(`KTO ${path} ${res.status}`);
    const body = (await res.json())?.response?.body;
    total = body?.totalCount ?? 0;
    const item = body?.items?.item;
    const chunk: T[] = Array.isArray(item) ? item : item ? [item] : [];
    if (chunk.length === 0) break;
    out.push(...chunk);
  }
  return out;
}

/* ── 집중률 (관광지별 상대 혼잡도 예측) ───────────────────────── */

export interface CongestionRow {
  tAtsNm: string; // 관광지명
  baseYmd: string; // YYYYMMDD
  cnctrRate: string; // 0~100
}

async function fetchCongestion(): Promise<CongestionRow[]> {
  // 구를 하나씩 훑으면 HTTP 25회가 줄줄이 이어져 6초가 걸린다(실측). 구끼리는
  // 서로를 기다릴 이유가 없어 다섯을 동시에 부른다 — 구 안의 페이지 넘김만
  // 순차로 남는다. 동시 호출을 다섯으로 묶어 두는 건 공사 쪽 호출 한도를
  // 건드리지 않기 위해서다.
  const perGu = await Promise.all(
    SIGNGU_CODES.map((signguCd) =>
      callAll<CongestionRow>("TatsCnctrRateService/tatsCnctrRatedList", {
        areaCd: AREA_CD,
        signguCd,
      }),
    ),
  );
  return perGu.flat();
}

/** 대전 전체 집중률 (6시간 캐시 — 일 단위로만 바뀐다) */
export const getCongestionRows = () =>
  unstable_cache(fetchCongestion, ["kto-congestion"], {
    revalidate: 21600,
    tags: ["kto-stats"],
  })();

/* ── 방문객 수 (시군구 일별, 외지인·외국인 구분) ───────────────── */

export interface VisitorRow {
  signguCode: string;
  touDivCd: string; // 1 현지인 / 2 외지인 / 3 외국인
  touNum: string;
  baseYmd: string; // 우리가 채워 넣는다 (API는 요청 날짜로만 구분)
}

const ymd = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

/**
 * 최근 가용일부터 7일치. 통계 공개가 며칠씩 밀리므로 어제부터 최대 45일을
 * 거슬러 올라가며 데이터가 있는 날을 찾고, 거기서부터 7일을 모은다.
 */
async function fetchVisitors(): Promise<VisitorRow[]> {
  const day = 24 * 3600 * 1000;
  let cursor = new Date(Date.now() - day);
  let found: Date | null = null;

  for (let i = 0; i < 45; i++) {
    const date = ymd(cursor);
    const rows = await callAll<VisitorRow>(
      "DataLabService/locgoRegnVisitrDDList",
      { startYmd: date, endYmd: date },
      2,
    );
    if (rows.length > 0) {
      found = new Date(cursor);
      break;
    }
    cursor = new Date(cursor.getTime() - day);
  }
  if (!found) return [];

  const out: VisitorRow[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(found.getTime() - i * day);
    const date = ymd(d);
    const rows = await callAll<VisitorRow>(
      "DataLabService/locgoRegnVisitrDDList",
      { startYmd: date, endYmd: date },
      2,
    );
    // 대전(30xxx)만 남긴다 — 전국이 다 내려온다
    out.push(
      ...rows
        .filter((r) => String(r.signguCode).startsWith("30"))
        .map((r) => ({ ...r, baseYmd: date })),
    );
  }
  return out;
}

/** 대전 방문객 (12시간 캐시 — 일 단위 통계라 자주 볼 필요가 없다) */
export const getVisitorRows = () =>
  unstable_cache(fetchVisitors, ["kto-visitors"], {
    revalidate: 43200,
    tags: ["kto-stats"],
  })();

/* ── 연관 관광지 (함께 방문되는 곳) ────────────────────────────── */

export interface RelatedRow {
  tAtsNm: string;
  rlteTatsNm: string;
  rlteRank?: string;
}

/** 최근 8개월 후보 (연관 통계는 몇 달 지연 공개된다) */
function candidateMonths(): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 1; i <= 8; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${m.getFullYear()}${String(m.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

async function fetchRelated(): Promise<RelatedRow[]> {
  // 데이터가 있는 최근 기준월을 먼저 찾는다 (대덕구로 탐침)
  let baseYm: string | null = null;
  for (const ym of candidateMonths()) {
    const probe = await callAll<RelatedRow>(
      "TarRlteTarService1/areaBasedList1",
      { areaCd: AREA_CD, signguCd: "30230", baseYm: ym },
      1,
    );
    if (probe.length > 0) {
      baseYm = ym;
      break;
    }
  }
  if (!baseYm) return [];

  const out: RelatedRow[] = [];
  for (const signguCd of SIGNGU_CODES) {
    out.push(
      ...(await callAll<RelatedRow>("TarRlteTarService1/areaBasedList1", {
        areaCd: AREA_CD,
        signguCd,
        baseYm,
      })),
    );
  }
  return out;
}

/** 연관 관광지 (24시간 캐시 — 월 단위 통계) */
export const getRelatedRows = () =>
  unstable_cache(fetchRelated, ["kto-related"], {
    revalidate: 86400,
    tags: ["kto-stats"],
  })();
