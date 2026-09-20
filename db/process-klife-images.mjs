// K-Life 가이드 시나리오 사진 변환 — 팀이 만든 원본 PNG(2MB 안팎)를 폭 1200 JPEG로
// 가볍게 줄여 public/klife/ 에 넣는다. 파일명은 시나리오 id 기준으로 고정해
// src/lib/klife-scenarios.ts 가 그대로 참조한다.
//
//   node db/process-klife-images.mjs <STEP 사진 폴더> <Do/Don't 사진 폴더>
//
// STEP 사진:  "교통_버스_1_….png" / "교통_지하철_STEP1_….png" / "식당_2_….png"
//             → public/klife/<scenario>-step-<n>.jpg
// Do/Don't:   "교통_버스_이렇게하세요.png" / "식당_피하세요.png"
//             → public/klife/<scenario>-do.jpg / -dont.jpg
import { mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "klife");

const [stepDir, dodontDir] = process.argv.slice(2);
if (!stepDir || !dodontDir) {
  console.error("사용법: node db/process-klife-images.mjs <STEP 사진 폴더> <Do/Don't 사진 폴더>");
  process.exit(1);
}

/** 파일명 앞머리 → 시나리오 id (klife-scenarios.ts 의 id 와 같아야 한다) */
const SCENARIO = {
  교통_버스: "bus",
  교통_지하철: "subway",
  교통_택시: "taxi",
  식당: "restaurant",
  온천: "oncheon",
  편의점: "convenience",
};
const PREFIXES = Object.keys(SCENARIO).sort((a, b) => b.length - a.length);

function scenarioOf(rawFile) {
  // macOS 는 한글 파일명을 자모 분리(NFD)로 주므로 합쳐서(NFC) 비교한다
  const file = rawFile.normalize("NFC");
  const p = PREFIXES.find((k) => file.startsWith(k + "_"));
  return p ? { id: SCENARIO[p], rest: file.slice(p.length + 1) } : null;
}

async function convert(src, outName) {
  const out = path.join(OUT_DIR, outName);
  await sharp(src).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(out);
  console.log(`${path.basename(src)} -> ${outName} (${(statSync(out).size / 1024).toFixed(0)} KB)`);
}

mkdirSync(OUT_DIR, { recursive: true });
const skipped = [];

for (const file of readdirSync(stepDir).filter((f) => f.toLowerCase().endsWith(".png"))) {
  const s = scenarioOf(file);
  const m = s && s.rest.match(/^(?:STEP)?(\d)_/i);
  if (!s || !m) {
    skipped.push(file);
    continue;
  }
  await convert(path.join(stepDir, file), `${s.id}-step-${m[1]}.jpg`);
}

for (const file of readdirSync(dodontDir).filter((f) => f.toLowerCase().endsWith(".png"))) {
  const s = scenarioOf(file);
  const kind = s && (s.rest.startsWith("이렇게하세요") ? "do" : s.rest.startsWith("피하세요") ? "dont" : null);
  if (!s || !kind) {
    skipped.push(file);
    continue;
  }
  await convert(path.join(dodontDir, file), `${s.id}-${kind}.jpg`);
}

if (skipped.length) {
  console.log("건너뜀 (이름 형식이 안 맞음):");
  skipped.forEach((f) => console.log("  " + f));
}
