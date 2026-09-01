// 콜라주 프레임 생성.
//
// ggoomdoriimg/collage-template.png(리포에 커밋하지 않는 원본, "꿈돌이와 심야
// 여행" 4컷 템플릿)에서 흰 사각형 4칸만 투명하게 도려내 public/collage-frame.png로
// 저장한다. 캡션 글자·마스코트·테두리·별표는 흰색이 아니라서 그대로 남는다.
//
// 이렇게 만든 프레임은 사진 4장을 각 칸에 먼저 그린 다음(맨 밑) 그 위에
// 그대로 덮어 쓴다(맨 위) — 그러면 캡션이 사진 위에 살아있는 채로 합성된다
// (src/lib/collage.ts가 브라우저에서 이 순서로 합성한다).
//
// 칸 좌표(COLLAGE_BOXES)는 원본 템플릿(788×1123)을 픽셀 단위로 스캔해 흰
// 영역의 바운딩 박스를 찾아 확정한 값이다 — 템플릿을 새로 받으면 이 스크립트의
// COLLAGE_BOXES와 src/lib/collage.ts의 COLLAGE_BOXES를 같이 다시 맞춰야 한다.
//
// 사용법: node db/process-collage-template.mjs
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, "ggoomdoriimg", "collage-template.png");
const OUT = path.join(ROOT, "public", "collage-frame.png");

// src/lib/collage.ts의 COLLAGE_BOXES와 반드시 같은 값을 유지한다
const BOXES = [
  { x: 52, y: 148, w: 294, h: 342 }, // 왼쪽 위
  { x: 368, y: 150, w: 362, h: 342 }, // 오른쪽 위
  { x: 52, y: 514, w: 320, h: 300 }, // 왼쪽 아래
  { x: 388, y: 516, w: 342, h: 300 }, // 오른쪽 아래
];

async function main() {
  const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const inBox = (x, y) =>
    BOXES.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!inBox(x, y)) continue;
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // 흰 배경만 투명하게 뺀다 — 캡션 글자·마스코트는 흰색이 아니라 그대로 남는다
      if (r > 235 && g > 235 && b > 235) {
        data[idx + 3] = 0;
      }
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png({ compressionLevel: 9 })
    .toFile(OUT);
  console.log("프레임 작성:", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
