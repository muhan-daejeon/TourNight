import { unstable_cache } from "next/cache";
import { SERVICE_NAME } from "./kto";

/**
 * KTO 통계 계열 실시간 조회 — 집중률·지역별 방문자수·연관 관광지.
 *
 * 명소 정보와 마찬가지로 로컬 DB에 적재하지 않고 요청 시점에 호출한다.
 * 세 API 모두 갱신이 하루 단위(공사 동기화 07:30)라 응답을 6시간 캐시해도
 * 신선도에 문제가 없다. 캐시는 원천을 대체하는 적재가 아니라 응답 재사용이다.
 */

const BASE = "https://apis.data.go.kr/B551011";
const TIMEOUT_MS = 8000;
/** 대전 5개 구 — 동·중·서·유성·대덕 */
const SIGNGU_CODES = ["30110", "30140", "30170", "30200", "30230"];
const DAEJEON_AREA = "30";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function call(
  path: string,
  extra: Record<string, string>,
  page = 1,
): Promise<any[]> {
  const params = new URLSearchParams({
    serviceKey: process.env.KTO_API_KEY ?? "",
    MobileOS: "ETC",
    MobileApp: SERVICE_NAME,
    _type: "json",
    numOfRows: "1000",
    pageNo: String(page),
    ...extra,
  });
  const res = await fetch(`${BASE}/${path}?${params}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`KTO ${path} ${res.status}`);
  const item = (await res.json())?.response?.body?.items?.item;
  return Array.isArray(item) ? item : item ? [item] : [];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** 관광지명 매칭용 정규화 — 공백·괄호 차이를 흡수한다 */
export const normName = (s: string) =>
  s.replace(/\s+/g, "").replace(/[()（）]/g, "").toLowerCase();

/* ---------- 관광지 집중률 (혼잡도 예측) ---------- */

export interface CongestionRow {
  /** 관광지명 (우리 스팟 제목과 매칭한다) */
  name: string;
  date: string; // YYYY-MM-DD
  rate: number; // 0~100, 최성수기 대비
}

/** 대전 전역의 향후 집중률 예측 (6시간 캐시) */
export const getCongestionRows = unstable_cache(
  async (): Promise<CongestionRow[]> => {
    const out: CongestionRow[] = [];
    for (const signguCd of SIGNGU_CODES) {
      for (let page = 1; page <= 3; page++) {
        const items = await call("TatsCnctrRateService/tatsCnctrRatedList", {
          areaCd: DAEJEON_AREA,
          signguCd,
        }, page);
        for (const it of items) {
          const ymd = String(it.baseYmd ?? "");
          if (ymd.length !== 8) continue;
          out.push({
            name: String(it.tAtsNm ?? ""),
            date: `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`,
            rate: Number(it.cnctrRate),
          });
        }
        if (items.length < 1000) break;
      }
    }
    return out;
  },
  ["kto-congestion"],
  { revalidate: 21600, tags: ["kto-stats"] },
);

/* ---------- 지역별 방문자수 ---------- */

export interface VisitorRow {
  signguCd: string;
  date: string; // YYYY-MM-DD
  /** 1 현지인 / 2 외지인 / 3 외국인 */
  touDiv: string;
  num: number;
}

/**
 * 대전 구별 일별 방문자 수.
 *
 * 집계가 몇 주 지연되므로 어제부터 거슬러 올라가며 자료가 있는 날을 찾고,
 * 그 날부터 7일치를 모은다. signguCd 파라미터를 받지 않아 전국을 받아
 * 대전(30…)만 걸러낸다.
 */
export const getVisitorRows = unstable_cache(
  async (): Promise<VisitorRow[]> => {
    const out: VisitorRow[] = [];
    const day = new Date();
    day.setDate(day.getDate() - 1);

    for (let back = 0; back < 45 && out.length === 0; back++) {
      const ymd =
        day.getFullYear().toString() +
        String(day.getMonth() + 1).padStart(2, "0") +
        String(day.getDate()).padStart(2, "0");
      const items = await call("DataLabService/locgoRegnVisitrDDList", {
        startYmd: ymd,
        endYmd: ymd,
      });
      for (const it of items) {
        const code = String(it.signguCode ?? "");
        if (!code.startsWith("30")) continue;
        const d = String(it.baseYmd ?? ymd);
        out.push({
          signguCd: code,
          date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
          touDiv: String(it.touDivCd ?? ""),
          num: Number(it.touNum),
        });
      }
      day.setDate(day.getDate() - 1);
    }
    return out;
  },
  ["kto-visitors"],
  { revalidate: 21600, tags: ["kto-stats"] },
);

/* ---------- 연관 관광지 ---------- */

export interface RelatedRow {
  /** 기준 관광지명 */
  name: string;
  /** 함께 방문되는 관광지명 */
  relatedName: string;
  rank: number | null;
}

/** 대전 관광지의 연관 방문 관계 (차량 이동 통계 기반) */
export const getRelatedRows = unstable_cache(
  async (): Promise<RelatedRow[]> => {
    // 최근 자료가 있는 달을 찾는다 (직전 달부터 6개월 거슬러)
    const out: RelatedRow[] = [];
    const d = new Date();
    for (let back = 1; back <= 6 && out.length === 0; back++) {
      const m = new Date(d.getFullYear(), d.getMonth() - back, 1);
      const baseYm =
        m.getFullYear().toString() + String(m.getMonth() + 1).padStart(2, "0");
      for (const signguCd of SIGNGU_CODES) {
        const items = await call("TarRlteTarService1/areaBasedList1", {
          baseYm,
          areaCd: DAEJEON_AREA,
          signguCd,
        });
        for (const it of items) {
          if (!it.rlteTatsNm) continue;
          out.push({
            name: String(it.tAtsNm ?? ""),
            relatedName: String(it.rlteTatsNm),
            rank: Number(it.rlteRank) || null,
          });
        }
      }
    }
    return out;
  },
  ["kto-related"],
  { revalidate: 21600, tags: ["kto-stats"] },
);
