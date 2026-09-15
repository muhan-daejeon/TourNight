/* eslint-disable @typescript-eslint/no-explicit-any */
type KakaoNS = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

let kakaoPromise: Promise<KakaoNS> | null = null;

/**
 * 카카오맵 SDK를 앱 전체에서 딱 한 번만 불러와 공유한다.
 *
 * 지도를 쓰는 컴포넌트(NightMap·CourseMap·NightBikeMap·StampTour)가 각자
 * <script> 태그를 따로 넣으면, 먼저 실행된 스크립트가 요청한 라이브러리만
 * window.kakao에 등록되고, 나중 스크립트는 window.kakao가 이미 있다고 보고
 * 아무 일도 안 한다 — 그래서 페이지 이동 순서에 따라 서비스/클러스터러
 * 라이브러리가 빠진 채로 남아 "MarkerClusterer is not a constructor" 같은
 * 에러가 났다. 앱에서 쓰는 라이브러리를 전부 한 스크립트에 모아 한 번만
 * 불러오고, kakao.maps.load까지 끝난 네임스페이스를 Promise로 공유한다.
 */
export function loadKakaoMaps(): Promise<KakaoNS> {
  if (kakaoPromise) return kakaoPromise;

  kakaoPromise = new Promise((resolve, reject) => {
    function ready() {
      const { kakao } = window as KakaoNS;
      kakao.maps.load(() => resolve(kakao));
    }
    const w = window as KakaoNS;
    if (w.kakao?.maps?.services && w.kakao?.maps?.MarkerClusterer) {
      ready();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY}&autoload=false&libraries=services,clusterer`;
    script.async = true;
    script.onload = ready;
    script.onerror = () => reject(new Error("Failed to load Kakao Maps SDK"));
    document.head.appendChild(script);
  });

  return kakaoPromise;
}
