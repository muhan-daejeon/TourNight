/**
 * 대전 축제·행사 카탈로그
 *
 * 1년 내내 이어지는 대전의 정기 축제를 큐레이션해 담는다. 홈의 포스터 나열과
 * /festivals 목록·상세가 모두 이 데이터를 쓴다.
 *
 * 왜 DB가 아니라 정적 모듈인가 — 정기 축제는 연 10건 남짓이고 해마다 "몇 월"은
 * 유지되지만 정확한 날짜는 매년 주최측 공고 전까지 확정되지 않는다. 확정 일정은
 * KTO TourAPI searchFestival2(eventStartDate/eventEndDate)에서 받아 채우는 것이
 * 맞고, 그때까지는 없는 날짜를 지어내지 않고 "매년 N월"로만 안내한다.
 * (2026-08 현재 KTO 키가 SERVICE_KEY_IS_NOT_REGISTERED_ERROR로 죽어 있어 연동 보류)
 */

export type Locale = "ko" | "en" | "ja" | "zh";

/** 포스터·히어로 배경 그라데이션 (Tailwind 클래스) */
export type FestivalTone =
  | "aurora"
  | "blossom"
  | "amber"
  | "ember"
  | "violet"
  | "teal"
  | "rose"
  | "indigo";

export const TONE_GRADIENT: Record<FestivalTone, string> = {
  aurora: "from-indigo-900 via-violet-900 to-slate-950",
  blossom: "from-rose-900 via-pink-900 to-slate-950",
  amber: "from-amber-800 via-orange-900 to-slate-950",
  ember: "from-red-900 via-rose-950 to-slate-950",
  violet: "from-fuchsia-900 via-purple-950 to-slate-950",
  teal: "from-teal-800 via-emerald-950 to-slate-950",
  rose: "from-pink-800 via-rose-950 to-slate-950",
  indigo: "from-sky-900 via-indigo-950 to-slate-950",
};

/** 포스터 상단 강조색 (배지·제목 하이라이트) */
export const TONE_ACCENT: Record<FestivalTone, string> = {
  aurora: "text-violet-200",
  blossom: "text-rose-200",
  amber: "text-amber-200",
  ember: "text-rose-200",
  violet: "text-fuchsia-200",
  teal: "text-emerald-200",
  rose: "text-pink-200",
  indigo: "text-sky-200",
};

interface RawFestival {
  id: string;
  title: Record<Locale, string>;
  /** 개최 장소 (포스터 하단) */
  place: Record<Locale, string>;
  /** 상세 페이지 소개문 — ja/zh는 en으로 폴백 */
  summary: { ko: string; en: string };
  /** 연례 개최 월 (1~12). 여러 달에 걸치면 endMonth를 다르게 준다 */
  startMonth: number;
  endMonth: number;
  tone: FestivalTone;
  /** 주최측 공식 안내 (없으면 대전관광 포털) */
  homepage: string;
  /** 코스·지도 연동용 — 축제장이 야경 명소로도 등록돼 있으면 그 contentId */
  spotContentId?: string;
}

/**
 * 대전에서 해마다 열리는 대표 축제.
 * 날짜는 주최측 공고에 따라 매년 달라지므로 "월"까지만 확정 정보로 둔다.
 */
const FESTIVALS: RawFestival[] = [
  {
    id: "zero-oclock",
    title: {
      ko: "대전 0시 축제",
      en: "Daejeon 0 O'Clock Festival",
      ja: "大田0時祭り",
      zh: "大田零点庆典",
    },
    place: {
      ko: "중구 중앙로 일원",
      en: "Jungangno St., Jung-gu",
      ja: "中区 中央路一帯",
      zh: "中区 中央路一带",
    },
    summary: {
      ko: "옛 대전역 앞 중앙로를 통째로 막고 밤 12시까지 이어지는 대전 최대 도심 축제. 원도심 전체가 무대가 되고 거리 공연과 야시장이 밤새 이어진다.",
      en: "Daejeon's largest downtown festival, closing Jungangno Street to traffic and running until midnight. The old city centre becomes one long stage of street performances and night markets.",
    },
    startMonth: 8,
    endMonth: 8,
    tone: "aurora",
    homepage: "https://www.daejeon.go.kr/tour/",
    spotContentId: "mock-6",
  },
  {
    id: "daecheongho-blossom",
    title: {
      ko: "대청호 벚꽃축제",
      en: "Daecheongho Cherry Blossom Festival",
      ja: "大清湖 桜まつり",
      zh: "大清湖 樱花庆典",
    },
    place: {
      ko: "대덕구 대청호반",
      en: "Daecheongho Lakeside, Daedeok-gu",
      ja: "大徳区 大清湖畔",
      zh: "大德区 大清湖畔",
    },
    summary: {
      ko: "대청호 호반도로를 따라 벚꽃이 이어지는 봄 축제. 해가 진 뒤 호수에 비치는 조명과 벚꽃이 겹쳐 낮과 전혀 다른 풍경이 된다.",
      en: "A spring festival along the cherry-lined lakeside road of Daecheongho. After sunset the lights on the water and the blossoms overlap into a scene nothing like the daytime one.",
    },
    startMonth: 4,
    endMonth: 4,
    tone: "blossom",
    homepage: "https://www.daejeon.go.kr/tour/",
    spotContentId: "mock-4",
  },
  {
    id: "yuseong-hotspring",
    title: {
      ko: "유성온천문화축제",
      en: "Yuseong Hot Spring Culture Festival",
      ja: "儒城温泉文化祭",
      zh: "儒城温泉文化庆典",
    },
    place: {
      ko: "유성구 유성온천공원 일원",
      en: "Yuseong Oncheon Park, Yuseong-gu",
      ja: "儒城区 儒城温泉公園一帯",
      zh: "儒城区 儒城温泉公园一带",
    },
    summary: {
      ko: "1300년 역사의 유성온천을 주제로 온천공원 일대에서 열리는 축제. 족욕 체험과 야간 공연이 함께 이어진다.",
      en: "Held around Yuseong Oncheon Park and built on 1,300 years of hot-spring history, with foot-bath experiences and evening performances.",
    },
    startMonth: 5,
    endMonth: 5,
    tone: "teal",
    homepage: "https://www.daejeon.go.kr/tour/",
  },
  {
    id: "gyejoksan-barefoot",
    title: {
      ko: "계족산 맨발축제",
      en: "Gyejoksan Barefoot Festival",
      ja: "鶏足山 はだしフェスティバル",
      zh: "鸡足山 赤脚庆典",
    },
    place: {
      ko: "대덕구 계족산 황톳길",
      en: "Gyejoksan Red-clay Trail, Daedeok-gu",
      ja: "大徳区 鶏足山 黄土道",
      zh: "大德区 鸡足山 黄土路",
    },
    summary: {
      ko: "14.5km 황톳길을 맨발로 걷는 대전의 대표 에코 힐링 축제. 숲속 음악회가 함께 열린다.",
      en: "Daejeon's signature eco-healing festival, walking the 14.5 km red-clay trail barefoot, paired with forest concerts.",
    },
    startMonth: 5,
    endMonth: 5,
    tone: "amber",
    homepage: "https://www.daejeon.go.kr/tour/",
  },
  {
    id: "bread-festival",
    title: {
      ko: "대전 빵축제",
      en: "Daejeon Bread Festival",
      ja: "大田パン祭り",
      zh: "大田面包庆典",
    },
    place: {
      ko: "동구 소제동 일원",
      en: "Soje-dong, Dong-gu",
      ja: "東区 蘇堤洞一帯",
      zh: "东区 苏堤洞一带",
    },
    summary: {
      ko: "'빵의 도시' 대전을 내건 축제. 지역 빵집이 한자리에 모이고, 철도관사촌이 남아 있는 소제동 골목이 함께 열린다.",
      en: "A festival for Daejeon's reputation as Korea's bread capital, gathering local bakeries in the Soje-dong alleys where the old railway workers' housing still stands.",
    },
    startMonth: 10,
    endMonth: 10,
    tone: "ember",
    homepage: "https://www.daejeon.go.kr/tour/",
    spotContentId: "mock-9",
  },
  {
    id: "science-festival",
    title: {
      ko: "대전 사이언스페스티벌",
      en: "Daejeon Science Festival",
      ja: "大田サイエンスフェスティバル",
      zh: "大田科学节",
    },
    place: {
      ko: "유성구 엑스포과학공원 일원",
      en: "Expo Science Park, Yuseong-gu",
      ja: "儒城区 エキスポ科学公園一帯",
      zh: "儒城区 世博科学公园一带",
    },
    summary: {
      ko: "과학도시 대전을 대표하는 축제. 엑스포과학공원과 한빛탑 일대가 무대여서, 해가 지면 한빛탑 조명과 미디어 전시가 이어진다.",
      en: "The flagship festival of Korea's science capital, staged around Expo Science Park and Hanbit Tower — after dark the tower lighting and media exhibits take over.",
    },
    startMonth: 10,
    endMonth: 10,
    tone: "indigo",
    homepage: "https://www.daejeon.go.kr/tour/",
    spotContentId: "mock-7",
  },
  {
    id: "hyo-culture-root",
    title: {
      ko: "대전효문화뿌리축제",
      en: "Daejeon Hyo (Filial Piety) Culture Festival",
      ja: "大田孝文化ルーツ祭り",
      zh: "大田孝文化寻根庆典",
    },
    place: {
      ko: "중구 뿌리공원 일원",
      en: "Ppuri Park, Jung-gu",
      ja: "中区 ルーツ公園一帯",
      zh: "中区 寻根公园一带",
    },
    summary: {
      ko: "성씨별 문중비가 모인 뿌리공원에서 열리는 효(孝) 주제 축제. 저녁에는 공원 전체에 조명이 들어온다.",
      en: "A festival on the theme of filial piety at Ppuri Park, where clan monuments of Korean family names are gathered; the whole park is lit in the evening.",
    },
    startMonth: 9,
    endMonth: 10,
    tone: "rose",
    homepage: "https://www.daejeon.go.kr/tour/",
    spotContentId: "mock-8",
  },
  {
    id: "yuseong-chrysanthemum",
    title: {
      ko: "유성 국화전시회",
      en: "Yuseong Chrysanthemum Exhibition",
      ja: "儒城 菊花展",
      zh: "儒城 菊花展",
    },
    place: {
      ko: "유성구 유성온천공원",
      en: "Yuseong Oncheon Park, Yuseong-gu",
      ja: "儒城区 儒城温泉公園",
      zh: "儒城区 儒城温泉公园",
    },
    summary: {
      ko: "가을 유성온천공원을 국화 조형물로 채우는 전시. 야간 조명을 함께 켜 늦은 시간까지 걷기 좋다.",
      en: "Autumn chrysanthemum sculptures filling Yuseong Oncheon Park, lit at night so the walk stays pleasant late into the evening.",
    },
    startMonth: 10,
    endMonth: 11,
    tone: "amber",
    homepage: "https://www.daejeon.go.kr/tour/",
  },
  {
    id: "jangtaesan-autumn",
    title: {
      ko: "장태산 단풍축제",
      en: "Jangtaesan Autumn Foliage Festival",
      ja: "長泰山 紅葉まつり",
      zh: "长泰山 红叶庆典",
    },
    place: {
      ko: "서구 장태산자연휴양림",
      en: "Jangtaesan Recreational Forest, Seo-gu",
      ja: "西区 長泰山自然休養林",
      zh: "西区 长泰山自然休养林",
    },
    summary: {
      ko: "메타세쿼이아 숲으로 이름난 장태산자연휴양림의 가을 축제. 스카이웨이에서 단풍 위를 걷는다.",
      en: "The autumn festival of Jangtaesan Recreational Forest, famous for its metasequoia grove — the skyway walks you out above the foliage.",
    },
    startMonth: 10,
    endMonth: 11,
    tone: "ember",
    homepage: "https://www.daejeon.go.kr/tour/",
  },
  {
    id: "winter-light",
    title: {
      ko: "대전 겨울빛 축제",
      en: "Daejeon Winter Light Festival",
      ja: "大田 冬の光まつり",
      zh: "大田 冬季灯光庆典",
    },
    place: {
      ko: "서구 엑스포다리·갑천 일원",
      en: "Expo Bridge & Gapcheon, Seo-gu",
      ja: "西区 エキスポ橋・甲川一帯",
      zh: "西区 世博桥·甲川一带",
    },
    summary: {
      ko: "갑천 일대와 엑스포다리를 조명으로 채우는 겨울 야간 프로그램. 해가 일찍 져 야경을 가장 길게 볼 수 있는 계절이다.",
      en: "A winter night programme lighting up the Gapcheon riverside and Expo Bridge — the season with the longest hours of night view, since the sun sets early.",
    },
    startMonth: 12,
    endMonth: 1,
    tone: "violet",
    homepage: "https://www.daejeon.go.kr/tour/",
    spotContentId: "mock-2",
  },
];

export interface Festival {
  id: string;
  title: string;
  place: string;
  summary: string;
  startMonth: number;
  endMonth: number;
  tone: FestivalTone;
  gradient: string;
  accent: string;
  homepage: string;
  spotContentId: string | null;
  /** 오늘 기준 개최 시즌인가 (히어로·'이번 달' 배지) */
  inSeason: boolean;
}

/** startMonth~endMonth가 연말을 넘길 수 있어(12→1) 모듈로로 판단한다 */
function isMonthInRange(month: number, start: number, end: number): boolean {
  return start <= end
    ? month >= start && month <= end
    : month >= start || month <= end;
}

/** 다음 개최까지 남은 개월 수 — 목록 정렬 기준 (진행 중이면 0) */
function monthsUntil(month: number, start: number, end: number): number {
  if (isMonthInRange(month, start, end)) return 0;
  return (start - month + 12) % 12;
}

function localize(f: RawFestival, locale: string): Festival {
  const loc = (["ko", "en", "ja", "zh"] as const).includes(locale as Locale)
    ? (locale as Locale)
    : "ko";
  const month = new Date().getMonth() + 1;
  return {
    id: f.id,
    title: f.title[loc],
    place: f.place[loc],
    // ja/zh 소개문은 따로 두지 않고 영문으로 폴백한다 (제목·장소는 현지어)
    summary: loc === "ko" ? f.summary.ko : f.summary.en,
    startMonth: f.startMonth,
    endMonth: f.endMonth,
    tone: f.tone,
    gradient: TONE_GRADIENT[f.tone],
    accent: TONE_ACCENT[f.tone],
    homepage: f.homepage,
    spotContentId: f.spotContentId ?? null,
    inSeason: isMonthInRange(month, f.startMonth, f.endMonth),
  };
}

/**
 * 축제 목록 — 지금 열리는 것부터, 그다음 다가오는 순서.
 * 1년 캘린더를 도는 순서라 "1년 내내 이어지는 대전"이 한눈에 보인다.
 */
export function listFestivals(locale = "ko"): Festival[] {
  const month = new Date().getMonth() + 1;
  return FESTIVALS.map((f) => localize(f, locale)).sort(
    (a, b) =>
      monthsUntil(month, a.startMonth, a.endMonth) -
        monthsUntil(month, b.startMonth, b.endMonth) ||
      a.startMonth - b.startMonth,
  );
}

/** 상세 페이지용 단건 조회 */
export function getFestival(id: string, locale = "ko"): Festival | null {
  const found = FESTIVALS.find((f) => f.id === id);
  return found ? localize(found, locale) : null;
}

/** 정적 경로 생성용 */
export function allFestivalIds(): string[] {
  return FESTIVALS.map((f) => f.id);
}
