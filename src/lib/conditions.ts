/**
 * 오늘 밤 정보 — 한국천문연구원 OpenAPI (대전 기준)
 * - 출몰시각(RiseSetInfoService): 일몰 시각 = 야경 시작 시간
 * - 월령(LunPhInfoService): 달 위상 → 별 관측 적합도
 * 실패 시 null 반환 → 위젯 자체를 숨긴다 (서비스 영향 없음)
 */

const KASI_BASE = "https://apis.data.go.kr/B090041/openapi/service";

export interface NightConditions {
  sunset: string; // "19:32"
  lunAge: number; // 0~29.5
  moonEmoji: string;
  starNight: boolean; // 그믐 전후 = 별 보기 좋은 밤
  fullMoon: boolean; // 보름 전후 = 달맞이 밤
}

function moonEmoji(age: number): string {
  const phases = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
  return phases[Math.round((age / 29.53) * 8) % 8];
}

export async function getNightConditions(): Promise<NightConditions | null> {
  const apiKey = process.env.KTO_API_KEY; // 공공데이터포털 공용 인증키
  if (!apiKey) return null;

  const now = new Date(Date.now() + 9 * 3600 * 1000); // KST
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");

  try {
    const key = encodeURIComponent(apiKey);
    const [riseRes, lunRes] = await Promise.all([
      fetch(
        `${KASI_BASE}/RiseSetInfoService/getAreaRiseSetInfo?serviceKey=${key}&location=${encodeURIComponent("대전")}&locdate=${y}${m}${d}`,
        { next: { revalidate: 21600 } },
      ),
      fetch(
        `${KASI_BASE}/LunPhInfoService/getLunPhInfo?serviceKey=${key}&solYear=${y}&solMonth=${m}&solDay=${d}`,
        { next: { revalidate: 21600 } },
      ),
    ]);
    if (!riseRes.ok || !lunRes.ok) return null;

    const riseXml = await riseRes.text();
    const lunXml = await lunRes.text();
    const sunsetRaw = riseXml.match(/<sunset>\s*(\d{4})/)?.[1];
    const lunAgeRaw = lunXml.match(/<lunAge>\s*([\d.]+)/)?.[1];
    if (!sunsetRaw || !lunAgeRaw) return null;

    const lunAge = Number(lunAgeRaw);
    return {
      sunset: `${sunsetRaw.slice(0, 2)}:${sunsetRaw.slice(2)}`,
      lunAge,
      moonEmoji: moonEmoji(lunAge),
      starNight: lunAge <= 4 || lunAge >= 26,
      fullMoon: lunAge >= 13 && lunAge <= 17,
    };
  } catch {
    return null;
  }
}
