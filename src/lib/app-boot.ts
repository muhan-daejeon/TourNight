"use client";

/**
 * 이 문서가 열려 있는 동안, 어떤 페이지에서든 렌더가 한 번이라도 커밋(화면에
 * 확정)된 적 있는지. Header.tsx는 모든 페이지에 있으므로, 그 첫 useEffect
 * (커밋 다음에 돈다)에서 이 값을 true로 바꾼다.
 *
 * 렌더 "중"이 아니라 효과(커밋 이후)에서만 바꾸는 게 핵심이다 — 그래야 홈을
 * 진짜 처음 여는 하이드레이션에서는, 헤더와 인트로가 화면에 그려지는 순서와
 * 무관하게 둘 다 아직 커밋 전이라 이 값을 false로 본다(서버가 렌더한 값과도
 * 같아 하이드레이션이 어긋나지 않는다). 그 뒤 로고 클릭 등으로 라우터를 통해
 * 홈에 온 경우엔 — 그 문서에서 이미 어딘가의 첫 커밋이 끝난 뒤이므로 — true를
 * 보게 된다. IntroSequence가 이 값으로 "정말 이 문서를 처음 연 순간인지, 같은
 * 문서 안에서 라우터로 돌아온 것인지"를 가른다.
 */
export let appAlreadyCommitted = false;

export function markAppCommitted() {
  appAlreadyCommitted = true;
}
