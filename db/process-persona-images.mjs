// 성향 테스트 이미지 처리.
//
// persona/ 폴더(리포에 커밋하지 않는 원본)에 "성향0.jpg"(인트로 우측 이미지)와
// "성향{문항번호}_{1~4}.jpg"(그 문항의 A~D 선택지 사진)를 넣고 실행하면,
// public/persona/에 가볍게 리사이즈해 저장하고 src/lib/persona-images.ts에
// 타입이 붙은 매니페스트를 만든다.
//
// 사용법: node db/process-persona-images.mjs
// (원본을 새로 받으면 재실행 — 기존 산출물을 덮어쓴다)
import sharp from "sharp";
import { readdirSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC_DIR = path.join(ROOT, "persona");
const OUT_DIR = path.join(ROOT, "public", "persona");
const MANIFEST_OUT = path.join(ROOT, "src", "lib", "persona-images.ts");

// 선택지 순서 — 성향{q}_1.jpg → a, _2 → b, _3 → c, _4 → d
const OPTION_KEYS = ["a", "b", "c", "d"];

const INTRO_RE = /^성향0\.jpg$/i;
const QUESTION_RE = /^성향(\d+)_([1-4])\.jpg$/i;

async function resizeTo(src, out, width) {
  await sharp(src).resize({ width, withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(out);
  return statSync(out).size;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const files = readdirSync(SRC_DIR).filter((f) => f.toLowerCase().endsWith(".jpg"));

  let introImage = null;
  const questions = {}; // { "1": { a: "/persona/q1-a.jpg", ... }, ... }
  const skipped = [];

  for (const file of files) {
    if (INTRO_RE.test(file)) {
      const outName = "persona-0.jpg";
      const size = await resizeTo(path.join(SRC_DIR, file), path.join(OUT_DIR, outName), 800);
      introImage = `/persona/${outName}`;
      console.log(`${file} -> ${outName} (${(size / 1024).toFixed(0)} KB)`);
      continue;
    }
    const m = file.match(QUESTION_RE);
    if (!m) {
      skipped.push(file);
      continue;
    }
    const [, qNum, optNum] = m;
    const optKey = OPTION_KEYS[Number(optNum) - 1];
    const outName = `persona-q${qNum}-${optKey}.jpg`;
    const size = await resizeTo(path.join(SRC_DIR, file), path.join(OUT_DIR, outName), 600);
    (questions[qNum] ??= {})[optKey] = `/persona/${outName}`;
    console.log(`${file} -> ${outName} (${(size / 1024).toFixed(0)} KB)`);
  }

  if (skipped.length) {
    console.log("건너뜀 (형식이 안 맞음):");
    skipped.forEach((f) => console.log("  " + f));
  }

  const ts = `// 자동 생성됨 — db/process-persona-images.mjs 로 persona/ 폴더에서 만들었다. 수동으로 고치지 말 것.

/** 성향 테스트 인트로 화면 우측에 쓰는 사진 (없으면 null) */
export const PERSONA_INTRO_IMAGE: string | null = ${introImage ? JSON.stringify(introImage) : "null"};

/** 문항 번호("1"~"6") → 선택지(a~d) → 사진 경로. 사진이 없는 문항은 키가 없다 */
export const PERSONA_QUESTION_IMAGES: Record<string, Partial<Record<"a" | "b" | "c" | "d", string>>> = ${JSON.stringify(questions, null, 2)};
`;
  writeFileSync(MANIFEST_OUT, ts, "utf8");
  console.log("매니페스트 작성:", MANIFEST_OUT);
  console.log("사진 있는 문항:", Object.keys(questions).sort((a, b) => Number(a) - Number(b)).join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
