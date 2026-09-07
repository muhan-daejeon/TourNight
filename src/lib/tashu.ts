import { readApiCache, writeApiCache } from "./api-cache";

/**
 * 대전 타슈(공영자전거) 실시간 대여소 현황.
 *
 * 인증은 헤더 api-token으로 한다 — 이 키는 절대 클라이언트로 보내지 않는다.
 * 여기서 서버 전용으로만 부르고, 클라이언트는 이 모듈을 감싼
 * /api/tashu/stations를 통해 정제된(키가 빠진) 결과만 받는다.
 *
 * 타슈 쪽에 "지정된 일일 한도"가 있다(구체 수치는 비공개) — 페이지를 열 때마다
 * 그대로 부르면 사람이 몰리는 시간대에 금방 소진될 수 있다. 짧게(1분) 메모리에
 * 캐시해 같은 서버 인스턴스에서는 그 안에 재요청이 와도 다시 부르지 않는다.
 * 호출 자체가 실패하면(장애·한도초과) api_cache에 남은 마지막 성공분으로
 * 폴백한다 — 완전히 옛날 데이터라도 지도가 텅 비는 것보다는 낫다.
 */

const STATION_URL = "https://bikeapp.tashu.or.kr:50041/v1/openapi/station";
const CACHE_KEY = "tashu:stations";
const MEMORY_TTL_MS = 60_000;

export interface TashuStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  /** 대여 가능한 자전거 수 — 0인 대여소도 걸러내지 않고 그대로 둔다 */
  parkingCount: number;
}

interface RawStation {
  id: string;
  name: string;
  x_pos: string;
  y_pos: string;
  address: string;
  parking_count: number;
}

interface RawResponse {
  count: number;
  results: RawStation[];
}

function normalize(raw: RawStation[]): TashuStation[] {
  return raw
    .map((r) => ({
      id: r.id,
      name: r.name,
      // 문서·실측 모두 x_pos=위도, y_pos=경도 — 헷갈리기 쉬운 이름이라 여기서만 변환한다
      lat: Number(r.x_pos),
      lng: Number(r.y_pos),
      address: r.address,
      parkingCount: r.parking_count,
    }))
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
}

let memoryCache: { at: number; data: TashuStation[] } | null = null;

export async function getTashuStations(): Promise<TashuStation[]> {
  if (memoryCache && Date.now() - memoryCache.at < MEMORY_TTL_MS) {
    return memoryCache.data;
  }

  const apiKey = process.env.TASHU_API_KEY;
  if (!apiKey) {
    throw new Error("TASHU_API_KEY가 설정되지 않았습니다");
  }

  try {
    const res = await fetch(STATION_URL, {
      headers: { "api-token": apiKey },
      // 실시간 현황이라 Next의 fetch 캐시는 쓰지 않는다 — 위 메모리 캐시가 그 역할을 한다
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`타슈 API 오류: ${res.status}`);
    const data = (await res.json()) as RawResponse;
    const stations = normalize(data.results);
    memoryCache = { at: Date.now(), data: stations };
    writeApiCache(CACHE_KEY, stations);
    return stations;
  } catch (err) {
    const fallback = await readApiCache<TashuStation[]>(CACHE_KEY);
    if (fallback && fallback.length > 0) return fallback;
    throw err;
  }
}
