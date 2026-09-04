import { redirect } from "@/i18n/navigation";

/**
 * 서바이벌 한국어는 나이트 에티켓 페이지로 완전 통합됐다 (행동과 말을 한
 * 흐름으로 배우게 하자는 피드백). 기존 링크·북마크가 깨지지 않게 넘겨 준다.
 */
export default async function PhrasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/etiquette#phrasebook", locale });
}
