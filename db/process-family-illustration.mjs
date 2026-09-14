// About 대전 페이지 "대전의 캐릭터, 꿈씨패밀리" 일러스트 처리.
//
// ggoomdoriimg/꿈씨패밀리.png(리포에 커밋하지 않는 원본, 5847x2952) — 을 읽어
// 표시 크기에 맞게 리사이즈해 public/about/에 저장한다. 한글 파일명은
// 플랫폼별 URL 인코딩 이슈가 있어 파일 이름은 영문으로 바꾼다.
//
// 사용법: node db/process-family-illustration.mjs
import sharp from "sharp";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, "ggoomdoriimg", "꿈씨패밀리.png");
const OUT_DIR = path.join(ROOT, "public", "about");
const OUT = path.join(OUT_DIR, "kkumssi-family.png");

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  await sharp(SRC)
    .resize({ width: 1600, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(OUT);
  const size = statSync(OUT).size;
  console.log(`꿈씨패밀리.png -> about/kkumssi-family.png (${(size / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
