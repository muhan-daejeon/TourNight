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
  /** 대전 현재 기온(°C) — 기상청 초단기실황. 조회 실패 시 null(표시 생략) */
  temp: number | null;
  /** 강수형태: "rain" | "snow" | "rainSnow" | null(없음) — 기상청 PTY 코드 매핑 */
  precip: "rain" | "snow" | "rainSnow" | null;
}

/**
 * 기상청 초단기실황 — 대전(격자 67,100)의 현재 기온·강수형태.
 *
 * 실황은 매시 40분쯤 그 시각 발표분이 올라온다. 정시 직후엔 아직 없으므로
 * 45분 전이면 한 시간 전 발표분을 조회하고, 그래도 NO_DATA면 한 시간 더
 * 이전으로 한 번 물러난다. 실패는 null — 날씨는 부가 정보라 위젯을 막지 않는다.
 */
async function getDaejeonWeather(
  apiKey: string,
): Promise<{ temp: number | null; precip: NightConditions["precip"] }> {
  const attempt = async (base: Date) => {
    const y = base.getUTCFullYear();
    const m = String(base.getUTCMonth() + 1).padStart(2, "0");
    const d = String(base.getUTCDate()).padStart(2, "0");
    const h = String(base.getUTCHours()).padStart(2, "0");
    const res = await fetch(
      `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst` +
        `?serviceKey=${encodeURIComponent(apiKey)}&dataType=JSON&numOfRows=10&pageNo=1` +
        `&base_date=${y}${m}${d}&base_time=${h}00&nx=67&ny=100`,
      { next: { revalidate: 1800 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const items: { category: string; obsrValue: string }[] =
      data?.response?.body?.items?.item ?? [];
    if (!items.length) return null;
    const val = (c: string) => items.find((it) => it.category === c)?.obsrValue;
    const t1h = Number(val("T1H"));
    const pty = Number(val("PTY") ?? 0);
    return {
      temp: Number.isFinite(t1h) ? t1h : null,
      precip:
        pty === 3 || pty === 7
          ? ("snow" as const)
          : pty === 2 || pty === 6
            ? ("rainSnow" as const)
            : pty > 0
              ? ("rain" as const)
              : null,
    };
  };

  try {
    const kst = new Date(Date.now() + 9 * 3600 * 1000);
    // 발표(매시 ~40분) 전이면 한 시간 전 발표분부터
    if (kst.getUTCMinutes() < 45) kst.setUTCHours(kst.getUTCHours() - 1);
    const first = await attempt(kst);
    if (first) return first;
    kst.setUTCHours(kst.getUTCHours() - 1);
    return (await attempt(kst)) ?? { temp: null, precip: null };
  } catch {
    return { temp: null, precip: null };
  }
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
    const [riseRes, lunRes, weather] = await Promise.all([
      fetch(
        `${KASI_BASE}/RiseSetInfoService/getAreaRiseSetInfo?serviceKey=${key}&location=${encodeURIComponent("대전")}&locdate=${y}${m}${d}`,
        { next: { revalidate: 21600 } },
      ),
      fetch(
        `${KASI_BASE}/LunPhInfoService/getLunPhInfo?serviceKey=${key}&solYear=${y}&solMonth=${m}&solDay=${d}`,
        { next: { revalidate: 21600 } },
      ),
      getDaejeonWeather(apiKey),
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
      temp: weather.temp,
      precip: weather.precip,
    };
  } catch {
    return null;
  }
}
