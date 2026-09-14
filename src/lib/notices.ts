/**
 * 공지사항 — 대전시·투어나잇이 내는 공지·행사·업데이트 소식.
 *
 * 외부 API 없이 정적 더미 데이터로 관리한다(요청: 2026-07-30~2026-09-14,
 * 총 15건). /notices 전체 목록 페이지와 홈 "투어나잇 소식" 섹션이 같은
 * 데이터를 함께 쓴다.
 */

export type NoticeCategory = "daejeon" | "tournight";

export interface Notice {
  id: string;
  /** 게시일 (YYYY-MM-DD) */
  date: string;
  category: NoticeCategory;
  title: string;
  author: string;
  views: number;
  body: string;
  /** 홈 "투어나잇 소식" 카드용 썸네일 (public/) */
  image: string;
}

// 최신순(내림차순) — 2026-07-30 ~ 2026-09-14 범위에 고르게 분포
export const NOTICES: Notice[] = [
  {
    id: "n15",
    date: "2026-09-14",
    category: "tournight",
    title: "홈 화면 인트로 화면 신규 적용 안내",
    author: "투어나잇 개발팀",
    views: 612,
    body: "투어나잇 홈 화면에 새로운 인트로 연출이 적용되었습니다. 대전의 밤을 형상화한 애니메이션과 함께 서비스를 시작해보세요. 이미 방문하신 적이 있다면 새로고침 시 다시 보실 수 있습니다.",
    image: "/hero-night.jpg",
  },
  {
    id: "n14",
    date: "2026-09-11",
    category: "daejeon",
    title: "대전 0시 축제 야간 프로그램 확정",
    author: "대전광역시 문화체육관광국",
    views: 4821,
    body: "올해 대전 0시 축제의 야간 특별 프로그램 일정이 확정되었습니다. 자정 카운트다운 불꽃놀이와 야시장이 함께 운영되며, 원도심 일대에서 다양한 공연이 이어집니다.",
    image: "/spots/jungangro-night.jpg",
  },
  {
    id: "n13",
    date: "2026-09-08",
    category: "tournight",
    title: "타슈 실시간 대여소 지도 정식 오픈",
    author: "투어나잇 개발팀",
    views: 1330,
    body: "대전 전역 타슈 대여소의 실시간 자전거 현황을 지도에서 바로 확인할 수 있는 '자전거 여행 with 타슈' 페이지가 정식 오픈했습니다. 대여소별 보유 대수를 색상으로 한눈에 볼 수 있습니다.",
    image: "/spots/expo-bridge.jpg",
  },
  {
    id: "n12",
    date: "2026-09-04",
    category: "daejeon",
    title: "한빛탑 야간 경관조명 리뉴얼 완료",
    author: "대전광역시 공원녹지과",
    views: 2765,
    body: "한빛탑의 야간 경관조명이 새롭게 단장되었습니다. 매일 저녁 8시부터 자정까지 점등되며, 계절별로 조명 색상이 달라질 예정입니다.",
    image: "/spots/hanbit-tower.jpg",
  },
  {
    id: "n11",
    date: "2026-09-01",
    category: "tournight",
    title: "도장투어 with 꿈돌이 네컷사진 기능 오픈",
    author: "투어나잇 운영팀",
    views: 3902,
    body: "야간 명소 4곳을 돌며 도장을 찍고 나만의 꿈돌네컷을 완성할 수 있는 '도장투어 with 꿈돌이' 서비스가 새롭게 열렸습니다. GPS로 위치를 확인한 뒤 사진을 올리면 그 자리에서 도장이 찍힙니다.",
    image: "/hero-night.jpg",
  },
  {
    id: "n10",
    date: "2026-08-28",
    category: "daejeon",
    title: "유성온천문화축제 개최 안내",
    author: "대전광역시 관광진흥과",
    views: 5104,
    body: "유성온천의 역사와 문화를 체험할 수 있는 유성온천문화축제가 이번 주말 개최됩니다. 야간 족욕 체험 부스와 온천수 활용 포토존이 함께 운영됩니다.",
    image: "/spots/expo-bridge.jpg",
  },
  {
    id: "n9",
    date: "2026-08-25",
    category: "tournight",
    title: "코스 생성 속도 17초 → 3초로 대폭 개선",
    author: "투어나잇 개발팀",
    views: 987,
    body: "AI 추론 설정과 경로 조회 방식을 함께 손봐, 코스 생성을 누르고 기다리는 시간을 크게 줄였습니다. 앞으로도 체감 속도 개선을 계속 이어가겠습니다.",
    image: "/spots/jungangro-night.jpg",
  },
  {
    id: "n8",
    date: "2026-08-22",
    category: "daejeon",
    title: "갑천 반딧불이 야간생태체험 참가자 모집",
    author: "대전광역시 환경정책과",
    views: 1567,
    body: "여름밤 갑천에서 반딧불이를 관찰할 수 있는 야간생태체험 프로그램 참가자를 모집합니다. 선착순 마감이며, 해설사와 함께하는 야간 탐방으로 진행됩니다.",
    image: "/spots/hanbit-tower.jpg",
  },
  {
    id: "n7",
    date: "2026-08-19",
    category: "tournight",
    title: "커뮤니티 실시간 번역 기능 오픈",
    author: "투어나잇 운영팀",
    views: 2231,
    body: "외국인 여행자와 내국인이 언어 장벽 없이 소통할 수 있도록, 커뮤니티 게시글·댓글에 실시간 번역 기능이 추가되었습니다. 버튼 한 번으로 4개 언어를 오갈 수 있습니다.",
    image: "/hero-night.jpg",
  },
  {
    id: "n6",
    date: "2026-08-15",
    category: "daejeon",
    title: "대전사이언스페스티벌 사전 접수 시작",
    author: "대전광역시 문화예술과",
    views: 3340,
    body: "과학의 도시 대전을 대표하는 대전사이언스페스티벌의 사전 접수가 시작되었습니다. 야간 개장일에는 천체관측·과학쇼 프로그램이 별도로 운영됩니다.",
    image: "/spots/expo-bridge.jpg",
  },
  {
    id: "n5",
    date: "2026-08-12",
    category: "tournight",
    title: "명소 여러 곳을 담아 코스 만들기 기능 추가",
    author: "투어나잇 개발팀",
    views: 1180,
    body: "가고 싶은 야경 명소를 최대 4곳까지 담으면, 그 곳을 전부 거치는 야간 코스를 AI가 순서까지 정해 짜 줍니다. 찜한 장소에서 바로 코스 만들기를 시작해보세요.",
    image: "/spots/jungangro-night.jpg",
  },
  {
    id: "n4",
    date: "2026-08-09",
    category: "daejeon",
    title: "한밭수목원 야간개장 연장 운영",
    author: "대전광역시 공원녹지과",
    views: 2098,
    body: "무더운 여름, 시원한 밤바람을 맞으며 산책할 수 있도록 한밭수목원의 야간개장 시간이 밤 10시까지 연장됩니다. 야간 조명 산책로도 새롭게 정비되었습니다.",
    image: "/spots/hanbit-tower.jpg",
  },
  {
    id: "n3",
    date: "2026-08-05",
    category: "tournight",
    title: "K-Life 가이드 서바이벌 한국어 콘텐츠 추가",
    author: "투어나잇 운영팀",
    views: 845,
    body: "밤 상황별로 바로 써먹을 수 있는 서바이벌 한국어 표현이 K-Life 가이드에 새롭게 추가되었습니다. 야식집·숙소·심야 이동 등 상황별로 검색해 바로 확인할 수 있습니다.",
    image: "/hero-night.jpg",
  },
  {
    id: "n2",
    date: "2026-08-02",
    category: "daejeon",
    title: "대전역 시민무대 야시장 개장",
    author: "대전광역시 관광진흥과",
    views: 4456,
    body: "대전역 인근 시민무대에서 매주 금·토요일 저녁 야시장이 열립니다. 대전 대표 먹거리와 지역 소상공인 부스를 만나보세요.",
    image: "/spots/expo-bridge.jpg",
  },
  {
    id: "n1",
    date: "2026-07-30",
    category: "tournight",
    title: "성향 테스트로 나만의 야간 코스 추천받기",
    author: "투어나잇 개발팀",
    views: 1729,
    body: "12개의 질문으로 나의 야간 여행 성향을 알아보고, 꼭 맞는 야간 코스를 추천받아보세요. 결과에 맞는 명소와 코스를 함께 제안해드립니다.",
    image: "/spots/jungangro-night.jpg",
  },
];

/** 홈 "투어나잇 소식" 섹션용 — 최신 소식 (기본 3건), href는 전체 목록 페이지로 */
export function listNotices(limit = 3) {
  return NOTICES.slice(0, limit).map((n) => ({
    id: n.id,
    date: n.date,
    title: n.title,
    summary: n.body,
    href: "/notices",
    image: n.image,
  }));
}
