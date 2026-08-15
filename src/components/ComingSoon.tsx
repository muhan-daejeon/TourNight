import { getTranslations } from "next-intl/server";
import { Construction } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * 데이터 연동 준비 중인 탭 안내.
 *
 * 맛집·숙박·쇼핑은 한국관광공사 TourAPI(contentTypeId 39/32/38)에서 받아야 하는데,
 * 발급 키가 SERVICE_KEY_IS_NOT_REGISTERED_ERROR로 막혀 있어 아직 채우지 못했다.
 * 빈 목록을 보여주느니 왜 비었는지 밝히고 지금 볼 수 있는 곳으로 안내한다.
 */
export default async function ComingSoon({
  titleKey,
}: {
  /** nav 네임스페이스의 탭 이름 키 (food | stay | shopping) */
  titleKey: "food" | "stay" | "shopping";
}) {
  const t = await getTranslations();

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <Construction size={30} className="text-amber-300" strokeWidth={1.6} />
      </div>
      <h1 className="mt-7 text-3xl font-bold tracking-tight">
        {t(`nav.${titleKey}`)}
      </h1>
      <p className="mt-4 max-w-md leading-relaxed text-slate-400">
        {t("comingSoon.body")}
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/spots"
          className="rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
        >
          {t("home.spotsViewAll")}
        </Link>
        <Link
          href="/festivals"
          className="rounded-full border border-white/15 px-6 py-3 text-sm font-bold text-slate-200 transition hover:border-amber-400/50 hover:text-amber-300"
        >
          {t("home.festivalsViewAll")}
        </Link>
      </div>
    </div>
  );
}
