import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { ArrowRight, Bike, ImageIcon, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import PageHero, { PageBody } from "@/components/PageHero";

/**
 * About 대전 — 처음 온 여행자를 위한 도시 소개 (피드백 11).
 * ① 대전은 어느 도시인가요 ② 대전의 캐릭터 꿈씨패밀리(일러스트는 디자이너
 * .ai 파일이 오면 채운다 — 지금은 자리만) ③ 무료 자전거 타슈 소개 + 이용 버튼.
 */
export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <>
      <PageHero
        image="/spots/hanbit-tower.jpg"
        overline="ABOUT DAEJEON"
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <PageBody>
        {/* ① 대전은 어느 도시인가요? */}
        <section className="mx-auto max-w-3xl py-8 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-daejeon-blue sm:text-3xl">
            {t("cityTitle")}
          </h2>
          <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-slate-600">
            {t("cityBody")}
          </p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["stat1", "stat2", "stat3", "stat4"] as const).map((k) => (
              <div key={k} className="rounded-xl bg-slate-50 px-3 py-4">
                <p className="text-lg font-extrabold text-slate-900">{t(`${k}.value`)}</p>
                <p className="mt-1 text-xs text-slate-500">{t(`${k}.label`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ② 대전의 캐릭터, 꿈씨패밀리 — 일러스트 자리 (디자이너 에셋 대기) */}
        <section className="mx-auto max-w-3xl border-t border-slate-200 py-10 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-daejeon-green sm:text-3xl">
            {t("familyTitle")}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-slate-600">
            {t("familyBody")}
          </p>
          {/* 꿈씨패밀리 일러스트가 들어올 자리 — public/kkumssi-family.png 로 넣으면
              아래 자리표시자를 이미지로 교체하면 된다 */}
          <div className="mt-7 flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
            <ImageIcon size={28} strokeWidth={1.5} />
            <p className="text-xs font-semibold">{t("familyPlaceholder")}</p>
          </div>
        </section>

        {/* ③ 무료 자전거 타슈 */}
        <section className="mx-auto max-w-3xl border-t border-slate-200 py-10 text-center">
          <h2 className="flex items-center justify-center gap-2 text-2xl font-extrabold tracking-tight text-daejeon-orange sm:text-3xl">
            <Bike size={26} />
            {t("tashuTitle")}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-slate-600">
            {t("tashuBody")}
          </p>
          <div className="relative mx-auto mt-7 h-52 max-w-xl overflow-hidden rounded-2xl">
            <Image
              src="/spots/expo-bridge.jpg"
              alt=""
              fill
              sizes="(min-width: 640px) 576px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/35" />
            <p className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-1.5 text-sm font-bold text-white drop-shadow">
              <MapPin size={14} />
              {t("tashuCaption")}
            </p>
          </div>
          <Link
            href="/night-bike"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-daejeon-orange px-8 py-3.5 text-sm font-bold text-white transition hover:bg-amber-500"
          >
            {t("tashuCta")}
            <ArrowRight size={16} />
          </Link>
        </section>
      </PageBody>
    </>
  );
}
