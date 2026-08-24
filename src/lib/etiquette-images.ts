import { getVerifiedNightSpots } from "./spots";

/**
 * 에티켓 주제 카드의 대표 사진.
 * 명소 유형 주제는 실제 대전 스팟 사진을, 문화·실용 주제는 라이선스를 확인한
 * 외부 사진(public/etiquette)을 쓴다.
 */
const TOPIC_SPOT_TITLE: Record<string, string> = {
  streets: "으능정이문화의거리",
  parks: "유림공원",
  views: "한빛탑",
  nature: "대청호",
  oncheon: "유성온천지구",
  festival: "유성국화축제",
  transport: "대전역 동광장",
};

const TOPIC_LOCAL_IMAGE: Record<string, string> = {
  pojangmacha: "/etiquette/pojangmacha.jpg",
  dining: "/etiquette/dining.jpg",
  noraebang: "/etiquette/noraebang.jpg",
  convenience: "/etiquette/convenience.jpg",
  latefood: "/etiquette/latefood.jpg",
  safety: "/etiquette/safety.jpg",
};

export async function getTopicImages(): Promise<Record<string, string>> {
  const images = { ...TOPIC_LOCAL_IMAGE };
  try {
    // 명소 사진은 KTO 실시간 목록에서 가져온다 (저장분을 쓰지 않는다)
    const spots = await getVerifiedNightSpots("ko");
    const byTitle = new Map(
      spots.filter((s) => s.imageUrl).map((s) => [s.title, s.imageUrl!]),
    );
    for (const [topic, title] of Object.entries(TOPIC_SPOT_TITLE)) {
      const url = byTitle.get(title);
      if (url) images[topic] = url;
    }
  } catch (err) {
    // 사진은 장식이므로 실패해도 아이콘 카드로 표시된다
    console.warn(
      "[etiquette] 주제 사진 조회 실패:",
      err instanceof Error ? err.message : err,
    );
  }
  return images;
}
