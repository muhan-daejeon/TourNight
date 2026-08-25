// 나이트 에티켓 Do/Don't 카드용 사진 처리.
//
// imgs/ 폴더(리포에 커밋하지 않는 원본, 수 MB짜리 PNG)에 "매핑단어(p|n)_설명.png"
// 형식의 파일을 넣고 실행하면, public/etiquette/items/에 가볍게(폭 1200px, JPEG)
// 리사이즈해 저장하고 src/lib/etiquette-items.ts에 타입이 붙은 매니페스트를 만든다.
//
// 사용법: node db/process-etiquette-images.mjs
// (원본을 새로 받으면 재실행 — 기존 산출물을 덮어쓴다)
import sharp from "sharp";
import { readdirSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC_DIR = path.join(ROOT, "imgs");
const OUT_DIR = path.join(ROOT, "public", "etiquette", "items");
const MANIFEST_OUT = path.join(ROOT, "src", "lib", "etiquette-items.ts");

// 파일명 맨 앞 단어 → NightEtiquette의 주제 id. 이 리포의 UI(NAV_ITEMS/TOPIC_ICONS)와
// 반드시 같이 맞춰야 한다. safety만 "야간"(parks와 겹침)이 아니라 "안전"으로 예외.
const WORD_TO_TOPIC = {
  밤거리: "streets",
  야간: "parks",
  전망: "views",
  안전: "safety",
  노래방: "noraebang",
  식당: "dining",
  심야: "transport",
  야식: "latefood",
  온천: "oncheon",
  자연: "nature",
  축제: "festival",
  편의점: "convenience",
  포장마차: "pojangmacha",
};

const FILENAME_RE = /^([가-힣]+)([pn])_(.+)\.png$/i;

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const files = readdirSync(SRC_DIR).filter((f) => f.toLowerCase().endsWith(".png"));

  const byTopic = {};
  const counters = {};
  const skipped = [];

  for (const file of files) {
    const m = file.match(FILENAME_RE);
    const topic = m && WORD_TO_TOPIC[m[1]];
    if (!m || !topic) {
      skipped.push(file);
      continue;
    }
    const [, , kind, captionRaw] = m;
    const bucket = kind.toLowerCase() === "p" ? "dos" : "donts";
    const counterKey = `${topic}-${bucket}`;
    counters[counterKey] = (counters[counterKey] || 0) + 1;
    const outName = `${topic}-${kind.toLowerCase()}-${counters[counterKey]}.jpg`;

    await sharp(path.join(SRC_DIR, file))
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toFile(path.join(OUT_DIR, outName));

    (byTopic[topic] ??= { dos: [], donts: [] })[bucket].push({
      image: `/etiquette/items/${outName}`,
      caption: captionRaw.trim(),
    });

    console.log(`${file} -> ${outName} (${(statSync(path.join(OUT_DIR, outName)).size / 1024).toFixed(0)} KB)`);
  }

  if (skipped.length) {
    console.log("건너뜀 (형식이 안 맞거나 모르는 단어):");
    skipped.forEach((f) => console.log("  " + f));
  }

  const ts = `// 자동 생성됨 — db/process-etiquette-images.mjs 로 imgs/ 폴더에서 만들었다. 수동으로 고치지 말 것.
export interface EtiquetteItem {
  image: string;
  caption: string;
}

export interface EtiquetteTopicItems {
  dos: EtiquetteItem[];
  donts: EtiquetteItem[];
}

export const ETIQUETTE_ITEMS: Record<string, EtiquetteTopicItems> = ${JSON.stringify(byTopic, null, 2)};
`;
  writeFileSync(MANIFEST_OUT, ts, "utf8");
  console.log("매니페스트 작성:", MANIFEST_OUT);
  console.log("포함된 주제:", Object.keys(byTopic).sort().join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
