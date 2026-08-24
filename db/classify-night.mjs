// 2단계: 야간 방문 적합성 1차 분류
// ① detailIntro2로 운영시간(usetime) 수집 → ② Gemini 배치 분류 → night_candidate/night_reason 저장
// 사용법: npm run db:classify   (최종 확정은 사람 검수 후 night_verified 갱신)
//
// 판정에 쓰는 이름·운영시간은 실행 시점에 KTO에서 받아 메모리로만 쓴다.
// DB에 남기는 것은 판정 결과(night_candidate/night_reason)뿐이다.
import postgres from "postgres";

const KTO_BASE = "https://apis.data.go.kr/B551011/KorService2";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

// contentTypeId별 운영시간 필드명
const TIME_FIELD = {
  12: "usetime",
  14: "usetimeculture",
  15: "playtime",
  28: "usetimeleports",
  38: "opentime",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

/** 판정에 쓸 이름을 KTO에서 받아 온다 (저장하지 않는다) */
async function fetchTitles() {
  const byId = new Map();
  for (const contentTypeId of ["12", "14", "15", "28", "38"]) {
    for (let pageNo = 1; pageNo <= 10; pageNo += 1) {
      const params = new URLSearchParams({
        serviceKey: process.env.KTO_API_KEY,
        MobileOS: "ETC",
        MobileApp: "TourNight",
        _type: "json",
        numOfRows: "100",
        pageNo: String(pageNo),
        arrange: "A",
        areaCode: "3",
        contentTypeId,
      });
      const res = await fetch(`${KTO_BASE}/areaBasedList2?${params}`);
      if (!res.ok) throw new Error(`KTO ${res.status}`);
      const items = (await res.json())?.response?.body?.items?.item ?? [];
      items.forEach((i) => byId.set(i.contentid, i.title));
      if (items.length < 100) break;
      await sleep(150);
    }
  }
  return byId;
}

async function fetchUseTime(contentId, contentTypeId) {
  const params = new URLSearchParams({
    serviceKey: process.env.KTO_API_KEY,
    MobileOS: "ETC",
    MobileApp: "TourNight",
    _type: "json",
    contentId,
    contentTypeId,
  });
  const res = await fetch(`${KTO_BASE}/detailIntro2?${params}`);
  if (!res.ok) throw new Error(`KTO ${res.status}`);
  const data = await res.json();
  const item = data?.response?.body?.items?.item?.[0];
  if (!item) return "";
  const field = TIME_FIELD[contentTypeId] ?? "usetime";
  const rest = item.restdate || item.restdateculture || item.restdateleports || "";
  return [item[field] || "", rest ? `휴무: ${rest}` : ""].filter(Boolean).join(" / ");
}

async function geminiClassify(batch) {
  const prompt = [
    "You are classifying Daejeon (Korea) tourist places for a NIGHT tourism service for foreign visitors.",
    "A place qualifies as a night spot only if visiting AFTER SUNSET (roughly 19:00+) is realistic and worthwhile:",
    "open at night OR an outdoor place freely accessible at night with night scenery value (bridges, plazas, night views), OR a night festival.",
    "Temples, museums/exhibitions that close by 18:00, daytime-only parks with no lighting, schools, and shops that close early do NOT qualify.",
    "Input JSON array follows. For EACH item return {\"id\", \"night\" (true/false), \"reason\" (Korean, under 30 chars)}.",
    "Respond with ONLY the JSON array, no markdown.",
    JSON.stringify(batch),
  ].join("\n");

  const res = await fetch(
    `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  return JSON.parse(text);
}

async function geminiWithRetry(batch) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await geminiClassify(batch);
    } catch (e) {
      if (attempt >= 5) throw e;
      console.log(`  Gemini 오류(${e.message}) — ${attempt * 30}초 대기 후 재시도`);
      await sleep(attempt * 30_000);
    }
  }
}

try {
  // ① 운영시간 수집 (아직 없는 것만)
  const targets = await sql`
    select content_id, content_type_id from night_spots
    where content_id not like 'mock-%' and use_time is null
  `;
  console.log(`운영시간 수집 대상: ${targets.length}건`);
  let done = 0;
  for (const t of targets) {
    try {
      const useTime = await fetchUseTime(t.content_id, t.content_type_id);
      await sql`update night_spots set use_time = ${useTime || "(정보 없음)"} where content_id = ${t.content_id}`;
    } catch (e) {
      console.log(`  ${t.content_id} 수집 실패: ${e.message}`);
    }
    done += 1;
    if (done % 30 === 0) console.log(`  ${done}/${targets.length}`);
    await sleep(150);
  }

  // ② Gemini 배치 분류 (미분류만) — 이름은 KTO에서 받아 온다
  const titles = await fetchTitles();
  const rows = (
    await sql`
      select content_id, category, use_time from night_spots
      where content_id not like 'mock-%' and night_candidate is null
      order by content_id
    `
  ).map((r) => ({ ...r, title: titles.get(r.content_id) ?? "" }));
  console.log(`분류 대상: ${rows.length}건`);
  for (let i = 0; i < rows.length; i += 25) {
    const chunk = rows.slice(i, i + 25);
    const batch = chunk.map((r) => ({
      id: r.content_id,
      title: r.title,
      category: r.category,
      usetime: r.use_time || "",
    }));
    const results = await geminiWithRetry(batch);
    for (const r of results) {
      await sql`
        update night_spots
        set night_candidate = ${!!r.night}, night_reason = ${r.reason || ""}
        where content_id = ${String(r.id)}
      `;
    }
    console.log(`분류 진행: ${Math.min(i + 25, rows.length)}/${rows.length}`);
    await sleep(7000);
  }

  const [{ yes, no }] = await sql`
    select count(*) filter (where night_candidate) ::int as yes,
           count(*) filter (where not night_candidate) ::int as no
    from night_spots where content_id not like 'mock-%'
  `;
  console.log(`분류 완료 — 야간 후보 ${yes}건 / 제외 ${no}건`);
} finally {
  await sql.end();
}
