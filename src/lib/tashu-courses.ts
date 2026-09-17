/**
 * 타슈 추천 라이딩 코스 (피드백: 대전관광의 자전거길 코스 카드처럼).
 *
 * 타슈 대여소가 밀집한 도심 하천 자전거도로와 야간 명소 좌표를 조합해
 * 미리 설계해 둔 코스들이다. start 좌표는 대여소가 몰려 있는 출발 지점 —
 * 페이지가 사용자의 GPS와 이 좌표의 거리를 재서 가장 가까운 코스를 맨 앞에
 * 세우고 네온 테두리로 밝힌다. 소요시간은 타슈 무료 구간(1시간) 안에서
 * 완주 가능하도록 잡았다.
 */
export type BikeLocale = "ko" | "en" | "ja" | "zh";
export type BText = Record<BikeLocale, string>;

export interface TashuCourse {
  id: string;
  name: BText;
  desc: BText;
  /** 출발 지점(대여소 밀집 지역) — 현위치와의 거리 계산 기준 */
  start: { lat: number; lng: number };
  startName: BText;
  /** 경유지 체인 — 이름(표시용) + 좌표(클릭 시 지도에 경로를 그리는 데 쓴다) */
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
      ko: "엑스포다리의 조명과 한빛탑을 강바람과 함께 — 대전 야간 라이딩의 정석.",
      en: "Expo Bridge lights and Hanbit Tower with a river breeze - the classic Daejeon night ride.",
      ja: "エキスポ橋のライトアップとハンビッ塔を川風と共に - 大田ナイトライドの王道。",
      zh: "伴着江风欣赏世博桥灯光与韩光塔——大田夜骑的经典之选。",
    },
    start: { lat: 36.3721, lng: 127.3893 },
    startName: {
      ko: "엑스포과학공원 앞",
      en: "Expo Science Park",
      ja: "エキスポ科学公園前",
      zh: "世博科学公园前",
    },
    stops: [
      { ko: "엑스포다리", en: "Expo Bridge", ja: "エキスポ橋", zh: "世博桥", lat: 36.3703, lng: 127.3875 },
      { ko: "갑천 자전거길", en: "Gapcheon Bike Path", ja: "甲川自転車道", zh: "甲川自行车道", lat: 36.3655, lng: 127.3845 },
      { ko: "한빛탑", en: "Hanbit Tower", ja: "ハンビッ塔", zh: "韩光塔", lat: 36.3723, lng: 127.3905 },
      { ko: "엑스포시민광장", en: "Expo Citizen Plaza", ja: "エキスポ市民広場", zh: "世博市民广场", lat: 36.3739, lng: 127.3868 },
    ],
    distanceKm: 5.2,
    durationMin: 35,
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
      ko: "시청에서 한밭수목원·예술의전당을 지나 시민광장까지, 평탄해서 초보에게 딱.",
      en: "From City Hall through Hanbat Arboretum and the Arts Center - flat and beginner-friendly.",
      ja: "市庁からハンバッ樹木園・芸術の殿堂を経て市民広場へ。平坦で初心者向き。",
      zh: "从市厅经韩田树木园和艺术殿堂到市民广场,一路平坦,适合新手。",
    },
    start: { lat: 36.3504, lng: 127.3845 },
    startName: {
      ko: "대전시청 앞",
      en: "Daejeon City Hall",
      ja: "大田市庁前",
      zh: "大田市厅前",
    },
    stops: [
      { ko: "보라매공원", en: "Boramae Park", ja: "ポラメ公園", zh: "波拉梅公园", lat: 36.3475, lng: 127.38 },
      { ko: "한밭수목원", en: "Hanbat Arboretum", ja: "ハンバッ樹木園", zh: "韩田树木园", lat: 36.3595, lng: 127.3825 },
      { ko: "예술의전당", en: "Daejeon Arts Center", ja: "芸術の殿堂", zh: "艺术殿堂", lat: 36.363, lng: 127.3798 },
      { ko: "엑스포시민광장", en: "Expo Citizen Plaza", ja: "エキスポ市民広場", zh: "世博市民广场", lat: 36.3739, lng: 127.3868 },
    ],
    distanceKm: 3.8,
    durationMin: 25,
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
      ko: "온천거리에서 유림공원을 돌아 갑천 상류까지 — 라이딩 끝엔 무료 족욕으로 마무리.",
      en: "From the hot spring street around Yurim Park to upper Gapcheon - end with a free foot bath.",
      ja: "温泉通りから儒林公園を回って甲川上流へ - 締めは無料の足湯で。",
      zh: "从温泉街绕儒林公园到甲川上游——骑行结束后免费泡个足浴。",
    },
    start: { lat: 36.3547, lng: 127.3416 },
    startName: {
      ko: "유성온천역 앞",
      en: "Yuseong Spa Station",
      ja: "儒城温泉駅前",
      zh: "儒城温泉站前",
    },
    stops: [
      { ko: "유성온천거리", en: "Hot Spring Street", ja: "温泉通り", zh: "温泉街", lat: 36.3545, lng: 127.345 },
      { ko: "유림공원", en: "Yurim Park", ja: "儒林公園", zh: "儒林公园", lat: 36.3605, lng: 127.348 },
      { ko: "갑천 상류길", en: "Upper Gapcheon Path", ja: "甲川上流の道", zh: "甲川上游路", lat: 36.365, lng: 127.352 },
      { ko: "족욕체험장", en: "Foot Bath", ja: "足湯体験場", zh: "足浴体验区", lat: 36.3575, lng: 127.345 },
    ],
    distanceKm: 4.4,
    durationMin: 30,
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
      ko: "대전역에서 대전천을 따라 으능정이 스카이로드·목척교 야경까지, 원도심의 밤.",
      en: "From Daejeon Station along the stream to Skyroad and Mokcheok Bridge - old town by night.",
      ja: "大田駅から大田川沿いにスカイロード・木尺橋の夜景へ。旧都心の夜。",
      zh: "从大田站沿大田川骑到Skyroad与木尺桥夜景——老城区之夜。",
    },
    start: { lat: 36.3315, lng: 127.4346 },
    startName: {
      ko: "대전역 앞",
      en: "Daejeon Station",
      ja: "大田駅前",
      zh: "大田站前",
    },
    stops: [
      { ko: "대전천 자전거길", en: "Daejeoncheon Path", ja: "大田川自転車道", zh: "大田川自行车道", lat: 36.33, lng: 127.432 },
      { ko: "목척교", en: "Mokcheok Bridge", ja: "木尺橋", zh: "木尺桥", lat: 36.3283, lng: 127.4288 },
      { ko: "으능정이 스카이로드", en: "Skyroad", ja: "スカイロード", zh: "Skyroad天空之路", lat: 36.3287, lng: 127.4272 },
      { ko: "중앙시장", en: "Jungang Market", ja: "中央市場", zh: "中央市场", lat: 36.331, lng: 127.43 },
    ],
    distanceKm: 3.2,
    durationMin: 22,
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
