// 성향 결과 마스코트 이미지 처리.
//
// ggoomdoriimg/ 폴더(리포에 커밋하지 않는 원본, 캐릭터명.png)를 읽어
// public/mascots/{성향키}.png로 가볍게 리사이즈해 저장하고(투명 배경 유지),
// src/lib/persona-mascot.ts에 성향키 → {name, image} 매니페스트를 만든다.
//
// 캐릭터명 자체를 파일명/URL에 쓰지 않는다 — 한글 파일명은 플랫폼별 URL 인코딩
// 이슈가 있어, 파일 이름은 영문 성향키로 고정하고 한글 이름은 매니페스트 값으로만 둔다.
//
// 사용법: node db/process-mascot-images.mjs
import sharp from "sharp";
import { readdirSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC_DIR = path.join(ROOT, "ggoomdoriimg");
const OUT_DIR = path.join(ROOT, "public", "mascots");
const MANIFEST_OUT = path.join(ROOT, "src", "lib", "persona-mascot.ts");

// 성향키 → 캐릭터명 (사용자가 정한 성향별 결과 문구의 마지막 이름)
const MASCOT_NAME = {
  explorer: "꿈빛이",
  player: "도르",
  socializer: "꿈달이",
  viewLover: "몽몽",
  culturist: "꿈동이",
  foodie: "온솔",
  trendsetter: "꿈누리",
};

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const files = readdirSync(SRC_DIR);

  const manifest = {}; // { explorer: { name: "꿈빛이", image: "/mascots/explorer.png" }, ... }
  const missing = [];

  for (const [type, name] of Object.entries(MASCOT_NAME)) {
    const file = files.find((f) => f === `${name}.png` || f === `${name}.jpg`);
    if (!file) {
      missing.push(`${type} (${name})`);
      continue;
    }
    const outName = `${type}.png`;
    await sharp(path.join(SRC_DIR, file))
      .resize({ width: 480, withoutEnlargement: true })
      .png({ compressionLevel: 9, quality: 85 })
      .toFile(path.join(OUT_DIR, outName));
    const size = statSync(path.join(OUT_DIR, outName)).size;
    manifest[type] = { name, image: `/mascots/${outName}` };
    console.log(`${file} -> ${outName} (${(size / 1024).toFixed(0)} KB)`);
  }

  if (missing.length) {
    console.log("파일을 못 찾음:");
    missing.forEach((m) => console.log("  " + m));
  }

  const ts = `// 자동 생성됨 — db/process-mascot-images.mjs 로 ggoomdoriimg/ 폴더에서 만들었다. 수동으로 고치지 말 것.
import type { PersonalityType } from "./personality-test";

/** 성향 결과 화면의 마스코트 — 캐릭터명(한글)과 사진 경로. 사진이 없는 성향은 키가 없다 */
export const PERSONA_MASCOT: Partial<Record<PersonalityType, { name: string; image: string }>> = ${JSON.stringify(manifest, null, 2)};
`;
  writeFileSync(MANIFEST_OUT, ts, "utf8");
  console.log("매니페스트 작성:", MANIFEST_OUT);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
