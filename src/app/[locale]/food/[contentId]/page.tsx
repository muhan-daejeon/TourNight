import LocalSpotDetail from "@/components/LocalSpotDetail";

export const revalidate = 3600;

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; contentId: string }>;
}) {
  const { locale, contentId } = await params;
  return <LocalSpotDetail kind="food" contentId={contentId} locale={locale} />;
}
