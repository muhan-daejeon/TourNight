/**
 * 타슈 추천 라이딩 코스 (피드백: 대전관광의 자전거길 코스 카드처럼).
 *
 * 모든 지점은 실제 검증된 야간 명소(getVerifiedNightSpots, KTO 실시간
 * 좌표) 중 서로 가까운 것들을 묶어 만든다 — 예전엔 지점 이름과 좌표를
 * 직접 지어냈는데, 실제로는 존재하지 않는 위치라 TMap이 엉뚱하게 먼
 * 길로 안내하는 문제가 있었다(예: "갑천 상류길"이라는 지점이 실은 몇 km
 * 떨어진 궁동 근처였다). 이제 좌표는 전부 KTO API로 확인한 값이다.
 *
 * start 좌표는 그 지점에 가장 가까운 실제 타슈 대여소 — 사용자의 GPS와
 * 이 좌표의 거리를 재서 가장 가까운 코스를 맨 앞에 세우고 네온 테두리로
 * 밝힌다. 소요시간은 타슈 무료 구간(1시간) 안에서 충분히 여유 있다.
 */
export type BikeLocale = "ko" | "en" | "ja" | "zh";
export type BText = Record<BikeLocale, string>;

export interface TashuCourse {
  id: string;
  name: BText;
  desc: BText;
  /** 출발 지점 — 실제로 가장 가까운 타슈 대여소 좌표. 현위치와의 거리 계산 기준 */
  start: { lat: number; lng: number };
  startName: BText;
  /** 경유지 체인 — 전부 실제 검증된 야간 명소의 KTO 좌표 */
  stops: (BText & { lat: number; lng: number })[];
  distanceKm: number;
  durationMin: number;
  /** 카드 대표 사진 (public 경로) */
  image: string;
}

export const TASHU_COURSES: TashuCourse[] = [
  {
    id: "gapcheon-night",
    name: {
      ko: "갑천 야경 코스",
      en: "Gapcheon Night View Course",
      ja: "甲川ナイトビューコース",
      zh: "甲川夜景路线",
    },
    desc: {
      ko: "엑스포과학공원에서 한빛탑과 엑스포다리를 지나 한밭수목원까지 - 대전 과학공원 지구의 밤을 걷는 정석 코스.",
      en: "From Expo Science Park past Hanbit Tower and Expo Bridge to Hanbat Arboretum - the classic night ride through Daejeon's science park district.",
      ja: "エキスポ科学公園からハンビッ塔・エキスポ橋を経てハンバッ樹木園へ - 大田サイエンスパーク地区の定番ナイトライド。",
      zh: "从世博科学公园经韩光塔、世博桥到韩田树木园——大田科学公园区的经典夜骑路线。",
    },
    // 실제 타슈 대여소: 도룡동 엑스포과학공원
    start: { lat: 36.3776, lng: 127.3791 },
    startName: {
      ko: "엑스포과학공원 앞",
      en: "Expo Science Park",
      ja: "エキスポ科学公園前",
      zh: "世博科学公园前",
    },
    stops: [
      {
        ko: "대전엑스포과학공원", en: "Daejeon Expo Science Park",
        ja: "大田エキスポ科学公園", zh: "大田世博科学公园",
        lat: 36.376, lng: 127.3803,
      },
      {
        ko: "한빛탑", en: "Hanbit Tower", ja: "ハンビッ塔", zh: "韩光塔",
        lat: 36.3757, lng: 127.3897,
      },
      {
        ko: "엑스포다리", en: "Expo Bridge", ja: "エキスポ橋", zh: "世博桥",
        lat: 36.3691, lng: 127.3888,
      },
      {
        ko: "한밭수목원", en: "Hanbat Arboretum", ja: "ハンバッ樹木園", zh: "韩田树木园",
        lat: 36.3672, lng: 127.3881,
      },
    ],
    distanceKm: 4.4,
    durationMin: 29,
    image: "/spots/expo-bridge.jpg",
  },
  {
    id: "dunsan-garden",
    name: {
      ko: "둔산 수목원 코스",
      en: "Dunsan Arboretum Course",
      ja: "屯山樹木園コース",
      zh: "屯山树木园路线",
    },
    desc: {
      ko: "대전시청 시민잔디광장에서 한밭수목원·엑스포다리까지 - 평탄해서 초보에게 딱.",
      en: "From City Hall's Citizen Lawn Square to Hanbat Arboretum and Expo Bridge - flat and beginner-friendly.",
      ja: "大田市庁市民芝生広場からハンバッ樹木園・エキスポ橋へ - 平坦で初心者向き。",
      zh: "从市厅市民草坪广场到韩田树木园、世博桥——路线平坦,适合新手。",
    },
    // 실제 타슈 대여소: 둔산동 대전시청(북문)
    start: { lat: 36.3511, lng: 127.3848 },
    startName: {
      ko: "대전시청 앞",
      en: "Daejeon City Hall",
      ja: "大田市庁前",
      zh: "大田市厅前",
    },
    stops: [
      {
        ko: "대전광역시청 시민잔디광장", en: "Daejeon City Hall Citizen Lawn Square",
        ja: "大田広域市庁市民芝生広場", zh: "大田广域市厅市民草坪广场",
        lat: 36.3505, lng: 127.385,
      },
      {
        ko: "한밭수목원", en: "Hanbat Arboretum", ja: "ハンバッ樹木園", zh: "韩田树木园",
        lat: 36.3672, lng: 127.3881,
      },
      {
        ko: "엑스포다리", en: "Expo Bridge", ja: "エキスポ橋", zh: "世博桥",
        lat: 36.3691, lng: 127.3888,
      },
    ],
    distanceKm: 3.0,
    durationMin: 20,
    image: "/spots/hanbat-arboretum.jpg",
  },
  {
    id: "yuseong-hotspring",
    name: {
      ko: "유성온천 발끝 코스",
      en: "Yuseong Hot Spring Course",
      ja: "儒城温泉コース",
      zh: "儒城温泉路线",
    },
    desc: {
      ko: "유성온천지구에서 무료 족욕체험장, 유림공원을 지나 갑천까지 - 라이딩 끝엔 무료 족욕으로 마무리.",
      en: "From Yuseong Hot Spring district through the free foot bath and Yurim Park to Gapcheon stream - end your ride with a free foot soak.",
      ja: "儒城温泉地区から無料足湯体験場・儒林公園を経て甲川へ - ライドの締めは無料の足湯で。",
      zh: "从儒城温泉区经免费足浴体验区、儒林公园到甲川——骑行结束后免费泡个足浴。",
    },
    // 실제 타슈 대여소: 봉명동 사이언스타운
    start: { lat: 36.3549, lng: 127.3445 },
    startName: {
      ko: "유성온천역 앞",
      en: "Yuseong Spa Station",
      ja: "儒城温泉駅前",
      zh: "儒城温泉站前",
    },
    stops: [
      {
        ko: "유성온천지구", en: "Yuseong Hot Spring District",
        ja: "儒城温泉地区", zh: "儒城温泉区",
        lat: 36.3553, lng: 127.3448,
      },
      {
        ko: "유성 족욕체험장", en: "Yuseong Free Foot Bath",
        ja: "儒城足湯体験場", zh: "儒城免费足浴区",
        lat: 36.355, lng: 127.3454,
      },
      {
        ko: "유림공원", en: "Yurim Park", ja: "儒林公園", zh: "儒林公园",
        lat: 36.3607, lng: 127.3577,
      },
      {
        ko: "갑천", en: "Gapcheon Stream", ja: "甲川", zh: "甲川",
        lat: 36.3628, lng: 127.3626,
      },
    ],
    distanceKm: 4.3,
    durationMin: 29,
    image: "/spots/observatory.jpg",
  },
  {
    id: "daejeoncheon-city",
    name: {
      ko: "대전천 원도심 코스",
      en: "Daejeoncheon Old Town Course",
      ja: "大田川旧都心コース",
      zh: "大田川老城区路线",
    },
    desc: {
      ko: "대전역 동광장에서 대전트래블라운지, 스카이로드를 지나 대흥동 문화예술의거리까지 - 원도심의 밤.",
      en: "From Daejeon Station's east plaza past the travel lounge and Skyroad to Daeheung-dong's arts street - old town by night.",
      ja: "大田駅東広場から大田トラベルラウンジ・スカイロードを経て大興洞文化芸術通りへ - 旧都心の夜。",
      zh: "从大田站东广场经大田旅游休息室、Skyroad到大兴洞文化艺术街——老城区之夜。",
    },
    // 실제 타슈 대여소: 소제동 대전역 동광장 버스정류장
    start: { lat: 36.3338, lng: 127.4374 },
    startName: {
      ko: "대전역 앞",
      en: "Daejeon Station",
      ja: "大田駅前",
      zh: "大田站前",
    },
    stops: [
      {
        ko: "대전역 동광장", en: "Daejeon Station East Plaza",
        ja: "大田駅東広場", zh: "大田站东广场",
        lat: 36.3342, lng: 127.4362,
      },
      {
        ko: "대전트래블라운지", en: "Daejeon Travel Lounge",
        ja: "大田トラベルラウンジ", zh: "大田旅游休息室",
        lat: 36.3305, lng: 127.43,
      },
      {
        ko: "스카이로드", en: "Skyroad", ja: "スカイロード", zh: "Skyroad天空之路",
        lat: 36.3291, lng: 127.4278,
      },
      {
        ko: "대흥동 문화예술의거리", en: "Daeheung-dong Arts Street",
        ja: "大興洞文化芸術通り", zh: "大兴洞文化艺术街",
        lat: 36.3259, lng: 127.4254,
      },
    ],
    distanceKm: 1.5,
    durationMin: 10,
    image: "/spots/jungangro-night.jpg",
  },
];

/** 두 좌표 사이 거리(m) — 코스 정렬용 하버사인 */
export function distanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
