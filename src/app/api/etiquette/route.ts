import { NextRequest, NextResponse } from "next/server";
import { generateEtiquette, ETIQUETTE_TOPICS } from "@/lib/gemini";
import { routing } from "@/i18n/routing";

// 같은 주제·언어 재요청 시 Gemini 호출을 아끼기 위한 서버 캐시 (1시간)
const cache = new Map<string, { text: string; expires: number }>();

export async function GET(request: NextRequest) {
  const topicId = request.nextUrl.searchParams.get("topic") ?? "";
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";

  if (!(topicId in ETIQUETTE_TOPICS) || !routing.locales.includes(locale as never)) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const key = `${topicId}:${locale}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ text: cached.text });
  }

  try {
    const text = await generateEtiquette(topicId, locale);
    cache.set(key, { text, expires: Date.now() + 60 * 60 * 1000 });
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
