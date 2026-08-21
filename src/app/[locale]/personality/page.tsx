import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCourses } from "@/lib/courses";
import { getVerifiedNightSpots } from "@/lib/spots";
import PersonalityTest from "@/components/PersonalityTest";

// 결과의 추천 코스는 검증 스팟 기준이라 코스 페이지와 같은 주기로 재생성
export const revalidate = 3600;

export default async function PersonalityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("personality");
  // 결과에서 성향에 맞는 코스·스팟을 추천하므로 미리 받아 넘긴다 (서로 무관 → 동시에)
  const [courses, spots] = await Promise.all([
    getCourses(locale),
    getVerifiedNightSpots(locale),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <p className="overline-label">Night Persona</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-3 mb-8 max-w-2xl text-slate-400">{t("subtitle")}</p>
      <PersonalityTest courses={courses} spots={spots} />
    </div>
  );
}
