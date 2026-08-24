import { getVerifiedNightSpots } from "./spots";

/**
 * 에티켓 주제 카드의 대표 사진.
 * 명소 유형 주제는 실제 대전 스팟 사진을, 문화·실용 주제는 라이선스를 확인한
 * 외부 사진(public/etiquette)을 쓴다.
 */
/**
 * 주제별 대표 명소 후보. 앞에 있는 것부터 찾아 사진이 있는 첫 곳을 쓴다.
 *
 * 이름 하나로 못 박아 두면 공사가 명칭을 바꿀 때 사진이 조용히 사라진다.
 * 실제로 '으능정이문화의거리'가 '스카이로드'로 바뀌면서 밤거리 주제가 빈 카드가 됐다.
 */
const TOPIC_SPOT_TITLES: Record<string, string[]> = {
  streets: ["스카이로드", "으능정이문화의거리", "대흥동 문화예술의거리", "인쇄거리"],
  parks: ["유림공원", "남선공원", "테미공원"],
  views: ["한빛탑", "식장산", "보문산"],
  nature: ["대청호", "갑천", "한밭수목원"],
  oncheon: ["유성온천지구", "유성 족욕체험장"],
  festival: ["유성국화축제", "대전사이언스페스티벌"],
  transport: ["대전역 동광장", "대전역"],
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
    const spots = (await getVerifiedNightSpots("ko")).filter((s) => s.imageUrl);
    const norm = (t: string) => t.replace(/\s+/g, "");

    for (const [topic, candidates] of Object.entries(TOPIC_SPOT_TITLES)) {
      for (const name of candidates) {
        // 띄어쓰기만 다른 경우가 잦아 정규화해 맞추고, 그래도 없으면 부분일치까지 본다
        const hit =
          spots.find((s) => norm(s.title) === norm(name)) ??
          spots.find((s) => norm(s.title).includes(norm(name)));
        if (hit) {
          images[topic] = hit.imageUrl!;
          break;
        }
      }
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
