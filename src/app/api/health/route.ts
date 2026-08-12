import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

/**
 * 외부 의존성 상태 점검.
 *
 * 이 서비스는 실패를 조용히 흘려보낸다 — 숙소 조회가 막히면 섹션이 사라지고,
 * 경로 API가 막히면 직선으로 그린다. 사용자 경험은 안 깨지지만 그만큼 고장을
 * 알아채기 어렵다. 배포 후 이 엔드포인트 하나만 열면 무엇이 죽었는지 바로 보인다.
 *
 * 접근 제한: HEALTH_TOKEN이 설정돼 있으면 ?token= 으로만, 없으면 로그인 필요.
 * 점검이 외부 API를 실제로 호출하므로 아무나 반복 호출하면 무료 한도를 태운다.
 * 같은 이유로 결과를 짧게 캐시해 연타를 막는다.
 */

const CACHE_MS = 60_000;
let cached: { at: number; body: unknown; ok: boolean } | null = null;

type Check = { ok: boolean; detail: string };

const ok = (detail = "ok"): Check => ({ ok: true, detail });
const fail = (detail: string): Check => ({ ok: false, detail: detail.slice(0, 160) });

/** 키가 아예 없으면 호출하지 않고 표시만 한다 (환경변수 누락과 API 장애를 구분) */
const missing = (name: string): Check => ({ ok: false, detail: `${name} 미설정` });

async function checkDb(): Promise<Check> {
  try {
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int n from night_spots where night_verified = true
    `;
    return ok(`검증 스팟 ${n}곳`);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

async function checkStorage(): Promise<Check> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return missing("SUPABASE_URL / SERVICE_ROLE_KEY");
  try {
    const res = await fetch(`${url}/storage/v1/bucket/community`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return fail(`HTTP ${res.status}`);
    const b = await res.json();
    return b.public ? ok("community 버킷 public") : fail("버킷이 public이 아님");
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

async function checkGemini(): Promise<Check> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return missing("GEMINI_API_KEY");
  try {
    // 모델 목록은 생성 쿼터를 쓰지 않으면서 키 유효성만 확인한다
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { signal: AbortSignal.timeout(5000) },
    );
    return res.ok ? ok() : fail(`HTTP ${res.status}`);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

async function checkTmap(): Promise<Check> {
  const key = process.env.TMAP_API_KEY;
  if (!key) return missing("TMAP_API_KEY");
  try {
    const res = await fetch(
      "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", appKey: key },
        body: JSON.stringify({
          startX: 127.3897, startY: 36.3757, endX: 127.3888, endY: 36.3691,
          startName: "s", endName: "e",
          reqCoordType: "WGS84GEO", resCoordType: "WGS84GEO",
        }),
        signal: AbortSignal.timeout(6000),
      },
    );
    const text = await res.text();
    if (res.ok) return ok();
    // IP 제한은 배포 환경에서만 터지는 함정이라 따로 알려준다
    if (text.includes("ACCESS_DENIED")) return fail("허용 IP 제한에 막힘");
    if (text.includes("INVALID_API_KEY")) return fail("앱키 거부 (상품 신청 확인)");
    return fail(`HTTP ${res.status}`);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

async function checkOdsay(): Promise<Check> {
  const key = process.env.ODSAY_API_KEY;
  if (!key) return missing("ODSAY_API_KEY");
  try {
    const params = new URLSearchParams({
      apiKey: key,
      SX: "127.3897", SY: "36.3757", EX: "127.3690", EY: "36.3210",
      OPT: "0", output: "json",
    });
    const res = await fetch(
      `https://api.odsay.com/v1/api/searchPubTransPathT?${params}`,
      {
        // 키가 Service URI에 묶여 있어 Referer 없이는 인증이 안 된다
        headers: { Referer: process.env.ODSAY_REFERER ?? "https://tournight.vercel.app/" },
        signal: AbortSignal.timeout(6000),
      },
    );
    const j = await res.json();
    const err = Array.isArray(j.error) ? j.error[0] : j.error;
    if (err) return fail(`${err.code} ${err.message ?? err.msg}`);
    return j?.result?.path?.length ? ok() : fail("경로 없음 응답");
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

/** KTO는 오퍼레이션별로 활용신청이 갈려서, 실제로 쓰는 두 개를 따로 본다 */
async function checkKto(op: "areaBasedList2" | "locationBasedList2"): Promise<Check> {
  const key = process.env.KTO_API_KEY;
  if (!key) return missing("KTO_API_KEY");
  const common = {
    serviceKey: key, MobileOS: "ETC", MobileApp: "TourNight",
    _type: "json", numOfRows: "1", pageNo: "1",
  };
  const params = new URLSearchParams(
    op === "areaBasedList2"
      ? { ...common, areaCode: "3" }
      : { ...common, mapX: "127.3897", mapY: "36.3757", radius: "1000" },
  );
  try {
    const res = await fetch(
      `https://apis.data.go.kr/B551011/KorService2/${op}?${params}`,
      { signal: AbortSignal.timeout(6000) },
    );
    const text = await res.text();
    if (text.includes("SERVICE_KEY_IS_NOT_REGISTERED")) {
      return fail("이 오퍼레이션 활용신청 안 됨");
    }
    if (!res.ok) return fail(`HTTP ${res.status}`);
    return ok();
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

export async function GET(request: NextRequest) {
  const token = process.env.HEALTH_TOKEN;
  if (token) {
    if (request.nextUrl.searchParams.get("token") !== token) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } else if (!(await getSessionUser())) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json(cached.body, { status: cached.ok ? 200 : 503 });
  }

  const [db, storage, gemini, tmap, odsay, ktoArea, ktoLocation] =
    await Promise.all([
      checkDb(),
      checkStorage(),
      checkGemini(),
      checkTmap(),
      checkOdsay(),
      checkKto("areaBasedList2"),
      checkKto("locationBasedList2"),
    ]);

  const checks = {
    db,
    storage,
    gemini,
    tmap,
    odsay,
    "kto.areaBasedList2": ktoArea,
    "kto.locationBasedList2": ktoLocation,
  };
  const allOk = Object.values(checks).every((c) => c.ok);
  const body = {
    ok: allOk,
    checkedAt: new Date().toISOString(),
    checks: Object.fromEntries(
      Object.entries(checks).map(([k, v]) => [k, v.ok ? v.detail : `FAIL: ${v.detail}`]),
    ),
  };

  cached = { at: Date.now(), body, ok: allOk };
  return NextResponse.json(body, { status: allOk ? 200 : 503 });
}
