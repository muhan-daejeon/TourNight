/**
 * 투어나잇 소식 — 서비스가 직접 내는 공지·업데이트
 *
 * 외부에서 긁어온 뉴스가 아니라 우리가 실제로 배포한 기능을 알리는 글이라
 * 별도 데이터 소스 없이 정적으로 관리한다. 날짜는 실제 배포일이다.
 */

type Locale = "ko" | "en" | "ja" | "zh";

export interface Notice {
  id: string;
  /** 배포일 (YYYY-MM-DD) */
  date: string;
  title: string;
  summary: string;
  /** 눌렀을 때 그 기능으로 바로 갈 수 있는 내부 경로 (locale 접두사 없음) */
  href: string;
  /** 썸네일로 쓸 공개 이미지 (public/) */
  image: string;
}

interface RawNotice extends Omit<Notice, "title" | "summary"> {
  title: Record<Locale, string>;
  summary: { ko: string; en: string };
}

const NOTICES: RawNotice[] = [
  {
    id: "multi-anchor-course",
    date: "2026-08-13",
    title: {
      ko: "명소 여러 곳을 담아 코스 만들기",
      en: "Build a course from several spots at once",
      ja: "複数の名所をまとめてコース作成",
      zh: "一次选多个景点生成路线",
    },
    summary: {
      ko: "가고 싶은 야경 명소를 최대 4곳까지 담으면, 그 곳을 전부 거치는 야간 코스를 AI가 순서까지 정해 짜 줍니다.",
      en: "Pick up to four night spots and the AI plans a night course that passes through all of them, ordering the stops for you.",
    },
    href: "/spots",
    image: "/spots/expo-bridge.jpg",
  },
  {
    id: "transit-steps",
    date: "2026-08-13",
    title: {
      ko: "코스에 버스·지하철 승하차 안내 추가",
      en: "Bus and subway boarding steps in every course",
      ja: "コースにバス・地下鉄の乗降案内を追加",
      zh: "路线新增公交·地铁上下车指引",
    },
    summary: {
      ko: "어느 정류장에서 타고 어디서 내리는지, 막차는 몇 시인지까지 코스 안에서 바로 확인할 수 있습니다.",
      en: "See which stop to board, where to get off, and when the last bus leaves — all inside the course itself.",
    },
    href: "/courses",
    image: "/spots/jungangro-night.jpg",
  },
  {
    id: "faster-course",
    date: "2026-08-13",
    title: {
      ko: "코스 생성 속도 17초 → 3초",
      en: "Course generation cut from 17s to 3s",
      ja: "コース生成が17秒→3秒に",
      zh: "路线生成从17秒缩短至3秒",
    },
    summary: {
      ko: "AI 추론 설정과 경로 조회 방식을 함께 손봐, 코스를 누르고 기다리는 시간을 크게 줄였습니다.",
      en: "Reworking the AI reasoning settings and route lookups together cut the wait after you hit 'plan a course'.",
    },
    href: "/courses",
    image: "/spots/hanbit-tower.jpg",
  },
];

function pick(locale: string): Locale {
  return (["ko", "en", "ja", "zh"] as const).includes(locale as Locale)
    ? (locale as Locale)
    : "ko";
}

/** 최신 소식 (기본 3건) */
export function listNotices(locale = "ko", limit = 3): Notice[] {
  const loc = pick(locale);
  return NOTICES.slice(0, limit).map((n) => ({
    id: n.id,
    date: n.date,
    title: n.title[loc],
    // ja/zh 본문은 영문 폴백 (제목은 현지어)
    summary: loc === "ko" ? n.summary.ko : n.summary.en,
    href: n.href,
    image: n.image,
  }));
}
