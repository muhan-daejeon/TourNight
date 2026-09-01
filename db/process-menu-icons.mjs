// 상단 메뉴 호버 아이콘 처리.
//
// ggoomdoriimg/menu1.png ~ menu4.png(리포에 커밋하지 않는 원본, 각각 최대
// 변 1800px 안팎)을 읽어 public/menu-icons/menu1.png ~ menu4.png로 작게
// 리사이즈해 저장한다(투명 배경 유지). 헤더 상단 4개 카테고리에 순서대로
// 1:1 매칭한다(순서는 Header.tsx의 MENU_GROUPS와 같다).
//
// 사용법: node db/process-menu-icons.mjs
import sharp from "sharp";
import { readdirSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC_DIR = path.join(ROOT, "ggoomdoriimg");
const OUT_DIR = path.join(ROOT, "public", "menu-icons");

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const files = readdirSync(SRC_DIR).filter((f) => /^menu[1-4]\.png$/i.test(f));

  for (const file of files) {
    const outPath = path.join(OUT_DIR, file.toLowerCase());
    await sharp(path.join(SRC_DIR, file))
      .resize({ width: 200, withoutEnlargement: true })
      .png({ compressionLevel: 9, quality: 85 })
      .toFile(outPath);
    const size = statSync(outPath).size;
    console.log(`${file} -> menu-icons/${file.toLowerCase()} (${(size / 1024).toFixed(0)} KB)`);
  }

  const missing = [1, 2, 3, 4]
    .map((n) => `menu${n}.png`)
    .filter((f) => !files.some((x) => x.toLowerCase() === f));
  if (missing.length) {
    console.log("파일을 못 찾음:", missing.join(", "));
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
