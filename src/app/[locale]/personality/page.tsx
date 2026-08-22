import { getTranslations, setRequestLocale } from "next-intl/server";
import PersonalityTest from "@/components/PersonalityTest";

export default async function PersonalityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("personality");

  // 추천 코스·스팟은 컴포넌트가 진행 중 /api/personality/recos로 실시간 조회한다.
  // (KTO 실시간 호출을 빌드에 넣으면 정적 생성이 타임아웃되므로 페이지는 데이터를
  //  받지 않는다 — 화면 셸만 정적으로 만든다.)
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <p className="overline-label">Night Persona</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-3 mb-8 max-w-2xl text-slate-400">{t("subtitle")}</p>
      <PersonalityTest />
    </div>
  );
}
