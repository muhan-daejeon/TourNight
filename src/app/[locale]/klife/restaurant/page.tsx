import { redirect } from "@/i18n/navigation";

/**
 * K-Life 가이드는 나이트 에티켓 페이지에 합쳐졌다 — 에티켓 상황을 고른 뒤
 * "시작하기"로 이어지는 흐름 안에서 식당편이 그대로 나온다. 북마크·외부
 * 링크가 남아 있을 수 있어 주소는 지우지 않고 통합 페이지로 보낸다.
 */
export default async function KLifeRestaurantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/etiquette", locale });
}
