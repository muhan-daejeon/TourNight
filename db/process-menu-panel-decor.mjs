// 헤더 드롭다운 패널 장식 이미지 처리.
//
// ggoomdoriimg/꿈돌순.png(꿈돌이·꿈순이 한 쌍), ggoomdoriimg/꿈돌우주.png(우주선 탄
// 꿈돌이) — 리포에 커밋하지 않는 원본 — 을 읽어 표시 크기에 맞게 리사이즈해
// public/menu-panel/에 저장한다. 한글 파일명은 플랫폼별 URL 인코딩 이슈가 있어
// 파일 이름은 영문으로 바꾼다.
//
// 사용법: node db/process-menu-panel-decor.mjs
import sharp from "sharp";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC_DIR = path.join(ROOT, "ggoomdoriimg");
const OUT_DIR = path.join(ROOT, "public", "menu-panel");

const FILES = [
  { src: "꿈돌순.png", out: "ggumdol-ggumsun.png", width: 480 },
  { src: "꿈돌우주.png", out: "ggumdol-space.png", width: 560 },
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const f of FILES) {
    const outPath = path.join(OUT_DIR, f.out);
    await sharp(path.join(SRC_DIR, f.src))
      .resize({ width: f.width, withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    const size = statSync(outPath).size;
    console.log(`${f.src} -> menu-panel/${f.out} (${(size / 1024).toFixed(0)} KB)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
