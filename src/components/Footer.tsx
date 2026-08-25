import { useTranslations } from "next-intl";
// lucide 1.x는 상표 문제로 브랜드 아이콘(Instagram·YouTube 등)을 뺐다 →
// 성격이 같은 일반 아이콘으로 대신하고, 어떤 채널인지는 title로 밝힌다
import { Camera, MessageCircle, Video } from "lucide-react";
import { Link } from "@/i18n/navigation";
import ScrollTopButton from "./ScrollTopButton";

/**
 * 아직 페이지가 없는 푸터 메뉴. 시안의 자리는 그대로 두되 누를 수 있는 척은
 * 하지 않는다 — 죽은 링크보다 '준비 중'이 낫다.
 */
const PENDING_LINKS = ["terms", "privacy", "support", "partners"] as const;

/** 계정 개설 전이라 링크는 비워 둔다 (사용자 결정) */
const SOCIALS = [
  { key: "instagram", Icon: Camera },
  { key: "youtube", Icon: Video },
  { key: "kakao", Icon: MessageCircle },
] as const;

export default function Footer() {
  const t = useTranslations();

  return (
    <footer className="mt-8 border-t border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between">
          {/* 브랜드 */}
          <div>
            <p className="text-[17px] font-extrabold tracking-tight text-white">
              Tour<span className="text-amber-400">Night</span>
            </p>
            <p className="mt-1.5 text-xs text-slate-500">{t("site.tagline")}</p>
          </div>

          {/* 메뉴 */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-slate-400">
            {PENDING_LINKS.map((key) => (
              <span
                key={key}
                title={t("comingSoon.short")}
                className="cursor-default text-slate-600"
              >
                {t(`footer.links.${key}`)}
              </span>
            ))}
            <Link href="/#news" className="transition hover:text-amber-300">
              {t("footer.links.notices")}
            </Link>
          </nav>

          {/* SNS + 맨 위로 */}
          <div className="flex items-center gap-2">
            {SOCIALS.map(({ key, Icon }) => (
              <span
                key={key}
                title={`${t(`footer.socials.${key}`)} · ${t("comingSoon.short")}`}
                className="flex size-9 cursor-default items-center justify-center rounded-full border border-white/10 text-slate-600"
              >
                <Icon size={16} />
              </span>
            ))}
            <ScrollTopButton />
          </div>
        </div>

        {/* 긴급 연락처 — 전 페이지 상시 노출 (외국인 야간 안전) */}
        <div className="mt-9 border-t border-white/[0.06] pt-6">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="font-bold text-amber-300/80">
              {t("etiquette.emergency.title")}
            </span>
            <span>
              <b className="text-slate-300">112</b>{" "}
              {t("etiquette.emergency.police")}
            </span>
            <span>
              <b className="text-slate-300">119</b>{" "}
              {t("etiquette.emergency.fire")}
            </span>
            <span>
              <b className="text-slate-300">1330</b>{" "}
              {t("etiquette.emergency.hotline")}
            </span>
          </p>
          <p className="mt-4 text-xs text-slate-600">{t("footer.notice")}</p>
          {/* 공모전 FAQ 지정 형식의 관광데이터 출처 표기 (텍스트만 허용, 로고 사용 금지) */}
          <p className="mt-1.5 text-[11px] text-slate-700">
            관광정보 출처: ⓒ한국관광공사 · 대중교통: 국토교통부 · 천문:
            한국천문연구원
          </p>
          {/* 공공누리 1유형 출처표시 의무 이행 */}
          <p className="mt-1 text-[11px] text-slate-700">
            Photos: 대전광역시 (공공누리 제1유형) · Wikimedia Commons (CC0 · CC
            BY 2.0 · CC BY 3.0 · CC BY-SA 2.0 · CC BY-SA 3.0 · CC BY-SA 4.0 ©
            Minseong Kim, Rickinasia, Twotwo2019, Ryuch, superlocal, ccfarmer,
            lazy fri13th, KOREA.NET, Teemeah)
          </p>
          <p className="mt-4 text-[11px] tracking-wide text-slate-700">
            © {new Date().getFullYear()} TourNight. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </footer>
  );
}
