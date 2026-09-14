// 도장투어 지도 배경 처리.
//
// imgs/지도.jpg(리포에 커밋하지 않는 원본, 1264x1264) — 을 읽어
// public/stamp-tour/에 저장한다. 이미 웹에 적당한 크기라 리사이즈 없이
// 압축만 다시 걸어 용량을 줄인다.
//
// 사용법: node db/process-stamp-tour-map.mjs
import sharp from "sharp";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, "imgs", "지도.jpg");
const OUT_DIR = path.join(ROOT, "public", "stamp-tour");
const OUT = path.join(OUT_DIR, "map.jpg");

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  await sharp(SRC).jpeg({ quality: 85 }).toFile(OUT);
  const size = statSync(OUT).size;
  console.log(`지도.jpg -> stamp-tour/map.jpg (${(size / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
