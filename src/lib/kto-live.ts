import { unstable_cache } from "next/cache";
import { SERVICE_NAME } from "./kto";

/**
 * KTO 관광정보 실시간 조회 레이어.
 *
 * 공사 방침(로컬 DB 적재 대신 실시간 호출 권고)에 맞춰, 명소의 원천 정보
 * (이름·주소·좌표·사진·운영시간)는 저장하지 않고 요청 시점에 API로 받는다.
 * 우리 DB에는 KTO에 없는 것 — 야간 검수 결과와 카테고리 판정 — 만 남는다.
 *
 * 매 요청마다 전국 목록을 새로 받으면 느리고 한도도 아까우므로, 응답만
 * 짧게 캐시한다(공사 동기화 주기가 04:30/07:30이라 1시간이면 충분).
 * 이는 원천을 대체하는 적재가 아니라 일반적인 응답 캐시다.
 */

const BASE = "https://apis.data.go.kr/B551011";
const DAEJEON = "3"; // 대전 areaCode
const TIMEOUT_MS = 8000;

/** 언어별 관광정보 서비스 — 공식 번역을 그대로 쓴다 */
const SERVICE: Record<string, string> = {
  ko: "KorService2",
  en: "EngService2",
  ja: "JpnService2",
  zh: "ChsService2",
};

interface ListItem {
  contentid: string;
  title: string;
  addr1?: string;
  mapx: string;
  mapy: string;
  firstimage?: string;
  contenttypeid?: string;
  cat1?: string;
  cat3?: string;
}

/** KTO 원천 명소 한 건 — DB에 저장하지 않고 요청 때마다 받는다 */
export interface KtoSpot {
  contentId: string;
  title: string;
  addr: string;
  mapX: number;
  mapY: number;
  imageUrl: string | null;
  contentTypeId: string | null;
  cat1: string | null;
  cat3: string | null;
}

function params(extra: Record<string, string>) {
  return new URLSearchParams({
    serviceKey: process.env.KTO_API_KEY ?? "",
    MobileOS: "ETC",
    MobileApp: SERVICE_NAME,
    _type: "json",
    ...extra,
  });
}

async function call(
  service: string,
  operation: string,
  extra: Record<string, string>,
): Promise<ListItem[]> {
  const res = await fetch(
    `${BASE}/${service}/${operation}?${params(extra)}`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  if (!res.ok) throw new Error(`KTO ${service}/${operation} ${res.status}`);
  const body = (await res.json())?.response?.body;
  const item = body?.items?.item;
  return Array.isArray(item) ? item : item ? [item] : [];
}

const toSpot = (i: ListItem): KtoSpot => ({
  contentId: i.contentid,
  title: i.title,
  addr: i.addr1 ?? "",
  mapX: Number(i.mapx),
  mapY: Number(i.mapy),
  imageUrl: i.firstimage || null,
  contentTypeId: i.contenttypeid ?? null,
  cat1: i.cat1 ?? null,
  cat3: i.cat3 ?? null,
});

/**
 * 대전 전체 명소를 언어별로 조회한다 (관광지 12 + 문화시설 14 + 축제 15).
 * 페이지당 100건씩, 응답이 빈 페이지가 나오면 멈춘다.
 */
async function fetchAll(locale: string): Promise<KtoSpot[]> {
  const service = SERVICE[locale] ?? SERVICE.ko;
  const out = new Map<string, KtoSpot>();

  for (const contentTypeId of ["12", "14", "15"]) {
    for (let page = 1; page <= 5; page++) {
      const items = await call(service, "areaBasedList2", {
        numOfRows: "100",
        pageNo: String(page),
        arrange: "A",
        areaCode: DAEJEON,
        contentTypeId,
      });
      items.filter((i) => i.mapx && i.mapy).forEach((i) => {
        const s = toSpot(i);
        if (Number.isFinite(s.mapX) && Number.isFinite(s.mapY)) {
          out.set(s.contentId, s);
        }
      });
      if (items.length < 100) break;
    }
  }
  return [...out.values()];
}

/**
 * 언어별 대전 명소 목록 (1시간 캐시).
 * 키에 언어를 넣어 언어를 바꿔도 각각 최신 공식 표기를 쓴다.
 */
export const getKtoSpots = (locale: string) =>
  unstable_cache(
    () => fetchAll(locale),
    ["kto-spots", locale],
    { revalidate: 3600, tags: ["kto-spots"] },
  )();

/** 명소 한 곳의 소개문 (상세 페이지용) — 언어별 공식 원문 */
export const getKtoOverview = (contentId: string, locale: string) =>
  unstable_cache(
    async () => {
      const service = SERVICE[locale] ?? SERVICE.ko;
      const rows = await call(service, "detailCommon2", {
        contentId,
        // 언어 서비스마다 contentId 체계가 달라, 없으면 빈 값으로 폴백한다
      });
      const raw = (rows[0] as unknown as { overview?: string })?.overview ?? "";
      return raw.replace(/<[^>]+>/g, "").trim();
    },
    ["kto-overview", contentId, locale],
    { revalidate: 3600, tags: ["kto-spots"] },
  )();
