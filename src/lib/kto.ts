/**
 * 한국관광공사 TourAPI 클라이언트
 *
 * KTO_API_KEY가 없으면 목(mock) 데이터를 반환한다.
 * (공공데이터포털 전환 작업으로 2026-08-02 18:00 이후 키 발급 가능 — 발급 후 실호출로 자동 전환)
 */

const BASE_URL = "https://apis.data.go.kr/B551011/KorService2";
const SERVICE_NAME = "TourNight"; // 공모전 필수: MobileApp 파라미터에 서비스 고유명
const DAEJEON_AREA_CODE = "3";

export interface NightSpot {
  contentId: string;
  title: string;
  addr: string;
  mapX: number; // 경도
  mapY: number; // 위도
  imageUrl: string | null;
  category: "science" | "nature" | "festival" | "city";
}

/** 키 발급 전 개발용 목 데이터 (대전 대표 야간 명소) */
export const MOCK_NIGHT_SPOTS: NightSpot[] = [
  {
    contentId: "mock-1",
    title: "한빛탑",
    addr: "대전광역시 유성구 대덕대로 480",
    mapX: 127.3897,
    mapY: 36.3757,
    imageUrl: "/spots/hanbit-tower.jpg", // Wikimedia Commons CC0
    category: "science",
  },
  {
    contentId: "mock-2",
    title: "엑스포다리",
    addr: "대전광역시 유성구 도룡동",
    mapX: 127.3888,
    mapY: 36.3691,
    imageUrl: "/spots/expo-bridge.jpg", // Wikimedia Commons CC0
    category: "city",
  },
  {
    contentId: "mock-3",
    title: "대전시민천문대",
    addr: "대전광역시 유성구 과학로 213-48",
    mapX: 127.3762,
    mapY: 36.3908,
    imageUrl: null,
    category: "science",
  },
  {
    contentId: "mock-4",
    title: "대청호 오백리길",
    addr: "대전광역시 대덕구 대청호수로",
    mapX: 127.4842,
    mapY: 36.4767,
    imageUrl: null,
    category: "nature",
  },
  {
    contentId: "mock-5",
    title: "식장산 전망대",
    addr: "대전광역시 동구 세천동",
    mapX: 127.4967,
    mapY: 36.3149,
    imageUrl: "/spots/sikjangsan.jpg", // 대전광역시, 공공누리 제1유형 (푸터 출처표시)
    category: "nature",
  },
  {
    contentId: "mock-6",
    title: "대전0시축제 (중앙로 일원)",
    addr: "대전광역시 중구 중앙로",
    mapX: 127.4255,
    mapY: 36.3282,
    imageUrl: null,
    category: "festival",
  },
];

export interface NearbyStay {
  contentId: string;
  title: string;
  addr: string;
  imageUrl: string;
  distM: number;
  mapX: number;
  mapY: number;
}

/** 좌표 반경 내 숙소 조회 (locationBasedList2, contentTypeId 32) — 사진 있는 곳만, 거리순 */
export async function fetchNearbyStays(
  mapX: number,
  mapY: number,
  { radius = 3000, limit = 4 }: { radius?: number; limit?: number } = {},
): Promise<NearbyStay[]> {
  const apiKey = process.env.KTO_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    serviceKey: apiKey,
    MobileOS: "ETC",
    MobileApp: SERVICE_NAME,
    _type: "json",
    numOfRows: "20",
    pageNo: "1",
    mapX: String(mapX),
    mapY: String(mapY),
    radius: String(radius),
    contentTypeId: "32", // 숙박
  });
  const res = await fetch(`${BASE_URL}/locationBasedList2?${params}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];

  const data = await res.json();
  const items: (KtoListItem & { dist: string })[] =
    data?.response?.body?.items?.item ?? [];

  return items
    .filter((it) => it.firstimage) // 사진 있는 곳만 (팀 방침)
    .map((it) => ({
      contentId: it.contentid,
      title: it.title,
      addr: it.addr1 || "",
      imageUrl: it.firstimage,
      distM: Math.round(Number(it.dist)),
      mapX: Number(it.mapx),
      mapY: Number(it.mapy),
    }))
    .sort((a, b) => a.distM - b.distM)
    .slice(0, limit);
}

/** 관광지 국문 개요 조회 (detailCommon2) — 수동 큐레이션 스팟(mock-)은 개요 없음 */
export async function fetchOverviewKo(contentId: string): Promise<string> {
  const apiKey = process.env.KTO_API_KEY;
  if (!apiKey || contentId.startsWith("mock-")) return "";

  const params = new URLSearchParams({
    serviceKey: apiKey,
    MobileOS: "ETC",
    MobileApp: SERVICE_NAME,
    _type: "json",
    contentId,
  });
  const res = await fetch(`${BASE_URL}/detailCommon2?${params}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data?.response?.body?.items?.item?.[0]?.overview ?? "";
}

interface KtoListItem {
  contentid: string;
  title: string;
  addr1: string;
  mapx: string;
  mapy: string;
  firstimage: string;
}

/** 대전 지역 관광지 목록 조회 (지역기반 관광정보) */
export async function fetchNightSpots(): Promise<NightSpot[]> {
  const apiKey = process.env.KTO_API_KEY;
  if (!apiKey) {
    return MOCK_NIGHT_SPOTS;
  }

  const params = new URLSearchParams({
    serviceKey: apiKey,
    MobileOS: "ETC",
    MobileApp: SERVICE_NAME,
    _type: "json",
    numOfRows: "50",
    pageNo: "1",
    arrange: "A",
    areaCode: DAEJEON_AREA_CODE,
    contentTypeId: "12", // 관광지
  });

  const res = await fetch(`${BASE_URL}/areaBasedList2?${params}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`KTO API 오류: ${res.status}`);
  }

  const data = await res.json();
  const items: KtoListItem[] = data?.response?.body?.items?.item ?? [];

  return items.map((item) => ({
    contentId: item.contentid,
    title: item.title,
    addr: item.addr1,
    mapX: Number(item.mapx),
    mapY: Number(item.mapy),
    imageUrl: item.firstimage || null,
    category: "city" as const,
  }));
}
