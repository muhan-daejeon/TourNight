// 인트로 배경(밤하늘 별사진) 처리.
//
// imgs/인트로.jpg(리포에 커밋하지 않는 원본, 2268x1688) — 을 읽어
// public/에 저장한다. 전체화면 배경으로 쓰므로 리사이즈 없이 압축만 건다.
//
// 사용법: node db/process-intro-bg.mjs
import sharp from "sharp";
import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, "imgs", "인트로.jpg");
const OUT = path.join(ROOT, "public", "intro-bg.jpg");

async function main() {
  await sharp(SRC).jpeg({ quality: 85 }).toFile(OUT);
  const size = statSync(OUT).size;
  console.log(`인트로.jpg -> intro-bg.jpg (${(size / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
