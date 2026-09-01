/**
 * "꿈돌이와 심야 여행" 4컷 콜라주 — 브라우저(canvas)에서만 만든다. 사진을 서버로
 * 보내지 않는다 — 개인 사진이라 그럴 이유가 없고, 그래서 서버 쪽 처리도 없다.
 *
 * public/collage-frame.png는 db/process-collage-template.mjs가 원본
 * 템플릿(ggoomdoriimg/collage-template.png, 리포에 없음)에서 흰 칸 4개만
 * 투명하게 도려낸 것이다 — 캡션·마스코트·테두리는 그대로 남아 있다.
 * 합성 순서: 사진 4장을 각 칸에 꽉 채워 그리고(맨 밑) → 그 위에 프레임을
 * 그대로 덮는다(맨 위) → 캡션이 사진 위에 살아있는 채로 나온다.
 *
 * 칸 좌표는 원본 템플릿(788×1123)을 픽셀 단위로 스캔해 흰 영역의 바운딩
 * 박스를 찾아 확정했다 — db/process-collage-template.mjs의 BOXES와 반드시
 * 같은 값을 유지해야 한다(하나만 바뀌면 사진이 칸을 벗어나 보인다).
 */

export const COLLAGE_SIZE = { width: 788, height: 1123 };

export const COLLAGE_BOXES = [
  { x: 52, y: 148, w: 294, h: 342 }, // 왼쪽 위
  { x: 368, y: 150, w: 362, h: 342 }, // 오른쪽 위
  { x: 52, y: 514, w: 320, h: 300 }, // 왼쪽 아래
  { x: 388, y: 516, w: 342, h: 300 }, // 오른쪽 아래
] as const;

const FRAME_SRC = "/collage-frame.png";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지를 불러오지 못했습니다: ${src}`));
    img.src = src;
  });
}

/** object URL로 잠깐 불러온 뒤 바로 해제한다 — 디코드는 onload 시점에 이미 끝나 있다 */
async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** object-fit: cover와 같은 크롭으로 박스를 꽉 채워 그린다 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  box: { x: number; y: number; w: number; h: number },
) {
  const boxRatio = box.w / box.h;
  const imgRatio = img.width / img.height;
  let sx: number, sy: number, sw: number, sh: number;
  if (imgRatio > boxRatio) {
    // 사진이 칸보다 옆으로 넓다 — 좌우를 자른다
    sh = img.height;
    sw = sh * boxRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    // 사진이 칸보다 위아래로 길다 — 위아래를 자른다
    sw = img.width;
    sh = sw / boxRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, box.x, box.y, box.w, box.h);
}

/**
 * 사진 4장(칸마다 하나, 없는 칸은 null)으로 콜라주를 만들어 PNG Blob으로
 * 돌려준다. 빈 칸은 원본처럼 흰 칸으로 남는다.
 */
export async function renderCollage(
  photos: readonly (File | null)[],
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = COLLAGE_SIZE.width;
  canvas.height = COLLAGE_SIZE.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context를 만들지 못했습니다");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < COLLAGE_BOXES.length; i++) {
    const file = photos[i];
    if (!file) continue;
    const img = await loadImageFromFile(file);
    drawCover(ctx, img, COLLAGE_BOXES[i]);
  }

  const frame = await loadImage(FRAME_SRC);
  ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지 생성에 실패했습니다"))),
      "image/png",
    );
  });
}
