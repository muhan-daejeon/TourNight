import { sql } from "./db";
import { getLocalSpots, type LocalKind, type LocalSpot } from "./kto-live";
import { routing } from "@/i18n/routing";

const SUPPORTED = new Set<string>(routing.locales);

/**
 * 맛집·숙박·쇼핑 이름의 외국어 처리. 명소(spots.ts)와 같은 방식이다.
 *
 * 공사 영문판에는 음식점이 6곳뿐이라 126곳 중 120곳이 한글로 남는다.
 * 공식 표기가 있으면 그것을, 없으면 우리가 AI로 옮겨 둔 이름을 쓰고,
 * 그것도 없는 곳은 뒤에서 채워 다음 요청부터 보이게 한다.
 */
export async function getLocalSpotsTranslated(
  kind: LocalKind,
  locale: string,
): Promise<LocalSpot[]> {
  const spots = await getLocalSpots(kind, locale);
  if (locale === "ko") return spots;

  const untranslated = (t: string) => /[가-힣]/.test(t);
  const ids = spots.filter((s) => untranslated(s.title)).map((s) => s.contentId);
  if (ids.length === 0) return spots;

  let saved = new Map<string, string>();
  try {
    const rows = await sql<{ content_id: string; title: string }[]>`
      select content_id, title from spot_translations
      where locale = ${locale} and content_id = any(${ids})
    `;
    saved = new Map(rows.map((r) => [r.content_id, r.title]));
  } catch (err) {
    console.warn("[local] 번역 조회 실패:", err instanceof Error ? err.message : err);
  }

  const out = spots.map((s) =>
    untranslated(s.title) && saved.has(s.contentId)
      ? { ...s, title: saved.get(s.contentId)! }
      : s,
  );
  fillMissing(out, locale);
  return out;
}

const filling = new Set<string>();

/** 아직 번역이 없는 이름을 뒤에서 채운다 — 화면은 기다리지 않는다 */
function fillMissing(spots: LocalSpot[], locale: string): void {
  const key = `${locale}`;
  if (filling.has(key)) return;
  // /robots.txt 같은 요청도 [locale] 라우트로 들어와 엉뚱한 로케일로 저장된 적이 있다
  if (!SUPPORTED.has(locale)) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const missing = spots.filter((s) => /[가-힣]/.test(s.title)).slice(0, 40);
  if (missing.length === 0) return;

  filling.add(key);
  void (async () => {
    try {
      const { translateSpotTitles } = await import("./gemini");
      const byKo = new Map(missing.map((s) => [s.title, s.contentId]));
      const translated = await translateSpotTitles([...byKo.keys()], locale);
      for (const [ko, title] of Object.entries(translated)) {
        const contentId = byKo.get(ko);
        if (!contentId) continue;
        await sql`
          insert into spot_translations (content_id, locale, title, source)
          values (${contentId}, ${locale}, ${title}, 'ai')
          on conflict (content_id, locale) do update
            set title = excluded.title, source = 'ai', updated_at = now()
        `;
      }
    } catch (err) {
      console.warn("[local] 이름 번역 실패:", err instanceof Error ? err.message : err);
    } finally {
      filling.delete(key);
    }
  })();
}
