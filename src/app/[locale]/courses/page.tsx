import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCourses } from "@/lib/courses";
import CourseExplorer from "@/components/CourseExplorer";

// 검증 스팟 기준으로 코스 생성 — 1시간 주기 재생성
export const revalidate = 3600;

export default async function CoursesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("courses");
  const courses = await getCourses(locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <p className="overline-label">Night Drive</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-3 mb-8 max-w-2xl text-slate-400">{t("subtitle")}</p>
      <CourseExplorer courses={courses} />
    </div>
  );
}
