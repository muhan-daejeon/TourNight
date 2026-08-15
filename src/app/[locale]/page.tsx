import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { ArrowRight, BookOpen, MessageSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getVerifiedNightSpots } from "@/lib/spots";
import { listFestivals } from "@/lib/festivals";
import { listNotices } from "@/lib/notices";
import { listPopularPosts } from "@/lib/community";
import NightInfo from "@/components/NightInfo";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";
import ScrollRail from "@/components/ScrollRail";
import FestivalPoster from "@/components/FestivalPoster";
import SpotCard from "@/components/SpotCard";

// 야간 검증 스팟·커뮤니티 인기글 기준, 1시간 주기로 재생성
export const revalidate = 3600;

/** 홈에 미리 보여줄 개수 — 나머지는 각 탭에서 전부 본다 */
const SPOT_PREVIEW = 8;
const FESTIVAL_PREVIEW = 8;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const site = await getTranslations("site");

  // 서로 의존하지 않으므로 한 번에 — 순차로 돌리면 홈 생성이 그만큼 늦어진다
  const [spots, popular] = await Promise.all([
    getVerifiedNightSpots(locale),
    listPopularPosts(4),
  ]);
  const festivals = listFestivals(locale);
  const notices = listNotices(locale);

  // 히어로: 지금 열리는 축제를 먼저, 그다음 서비스 소개·AI 코스.
  // 비수기에도 배너가 비지 않도록 뒤 두 장은 항상 붙인다.
  const slides: HeroSlide[] = [
    ...festivals
      .filter((f) => f.inSeason)
      .slice(0, 2)
      .map((f) => ({
        id: f.id,
        overline: t("heroFestivalOverline"),
        title: f.title,
        subtitle: f.summary,
        ctaLabel: t("heroFestivalCta"),
        href: `/festivals/${f.id}`,
        gradient: f.gradient,
      })),
    {
      id: "brand",
      overline: site("description"),
      title: t("heroTitle"),
      subtitle: t("heroSubtitle"),
      ctaLabel: t("ctaSpots"),
      href: "/spots",
      gradient: "from-slate-950 via-indigo-950 to-slate-950",
      image: "/hero-night.jpg",
    },
    {
      id: "ai-course",
      overline: t("heroAiOverline"),
      title: t("heroAiTitle"),
      highlight: t("heroAiHighlight"),
      subtitle: t("heroAiSubtitle"),
      ctaLabel: t("heroAiCta"),
      href: "/courses",
      gradient: "from-violet-950 via-indigo-950 to-slate-950",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <div className="pt-5">
        <HeroCarousel slides={slides} />
      </div>

      {/* 오늘 밤 정보 — 천문연구원 일몰·월령 */}
      <div className="pt-6">
        <NightInfo />
      </div>

      {/* ── 축제&행사 — 1년 캘린더를 포스터로 ── */}
      <section className="pt-14">
        <SectionHead
          title={t("festivalsSection")}
          subtitle={t("festivalsSectionSub")}
          href="/festivals"
          linkLabel={t("festivalsViewAll")}
        />
        <ScrollRail label={t("festivalsSection")}>
          {festivals.slice(0, FESTIVAL_PREVIEW).map((f) => (
            <div key={f.id} className="w-[200px] snap-start sm:w-[220px]">
              <FestivalPoster festival={f} />
            </div>
          ))}
        </ScrollRail>
      </section>

      {/* ── 야경 명소 추천 ── */}
      <section className="pt-14">
        <SectionHead
          title={t("spotsSection")}
          subtitle={t("spotsSectionSub")}
          href="/spots"
          linkLabel={t("spotsViewAll")}
        />
        {spots.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-slate-500">
            {t("noResults")}
          </p>
        ) : (
          <ScrollRail label={t("spotsSection")}>
            {spots.slice(0, SPOT_PREVIEW).map((spot) => (
              <div
                key={spot.contentId}
                className="w-[250px] shrink-0 snap-start sm:w-[280px]"
              >
                <SpotCard spot={spot} />
              </div>
            ))}
          </ScrollRail>
        )}
      </section>

      {/* ── 소식 · 인기글 · 갤러리 ── */}
      <section className="grid gap-8 pt-16 lg:grid-cols-[1.45fr_1fr_1fr]">
        {/* 투어나잇 소식 */}
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {t("newsSection")}
          </h2>
          <p className="mt-1.5 mb-5 text-sm text-slate-400">
            {t("newsSectionSub")}
          </p>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
            {/* 월간 소식 카드 */}
            <Link
              href="/festivals"
              className="group relative flex min-h-[190px] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-900 via-violet-950 to-slate-950 p-5 transition hover:border-amber-400/40"
            >
              <div className="pointer-events-none absolute inset-x-0 -top-14 h-36 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.18),transparent_70%)]" />
              <p className="relative text-[11px] font-bold tracking-wide text-violet-200">
                {monthLabel(locale)}
              </p>
              <h3 className="relative mt-2 text-lg font-extrabold leading-snug text-white">
                {site("title")}
                <br />
                {t("monthlyIssueTitle")}
              </h3>
              <span className="relative mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur transition group-hover:bg-amber-400 group-hover:text-slate-950">
                {t("monthlyIssueCta")}
                <ArrowRight size={13} />
              </span>
            </Link>

            {/* 최근 업데이트 3건 */}
            <ul className="flex flex-col gap-3">
              {notices.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    className="group flex gap-3 rounded-xl p-1.5 transition hover:bg-white/[0.04]"
                  >
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                      <Image
                        src={n.image}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-[13px] font-bold text-amber-300">
                        {n.title}
                      </h4>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-400">
                        {n.summary}
                      </p>
                      <time
                        dateTime={n.date}
                        className="mt-1 block text-[11px] text-slate-600"
                      >
                        {n.date.replace(/-/g, ".")}
                      </time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 이번 주 인기글 */}
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {t("popularSection")}
          </h2>
          <p className="mt-1.5 mb-5 text-sm text-slate-400">
            {t("popularSectionSub")}
          </p>
          {popular.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
              {t("popularEmpty")}
            </p>
          ) : (
            <ol className="flex flex-col gap-3.5">
              {popular.map((post, i) => (
                <li key={post.id}>
                  <Link
                    href="/community"
                    className="group flex items-start gap-3 rounded-xl p-1.5 transition hover:bg-white/[0.04]"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[11px] font-extrabold text-amber-300">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-slate-100 group-hover:text-amber-300">
                        {post.body}
                      </p>
                      <p className="mt-1 flex items-center gap-2.5 text-[11px] text-slate-500">
                        <span className="truncate">{post.author}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          <MessageSquare size={11} />
                          {post.commentCount}
                        </span>
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* 야경 갤러리 — 실제 등록 명소 사진 */}
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {t("gallerySection")}
          </h2>
          <p className="mt-1.5 mb-5 text-sm text-slate-400">
            {t("gallerySectionSub")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {spots
              .filter((s) => s.imageUrl)
              .slice(0, 6)
              .map((s) => (
                <Link
                  key={s.contentId}
                  href={`/spots/${s.contentId}`}
                  aria-label={s.title}
                  className="relative aspect-square overflow-hidden rounded-lg bg-slate-900"
                >
                  <Image
                    src={s.imageUrl!}
                    alt={s.title}
                    fill
                    sizes="110px"
                    className="object-cover transition duration-500 hover:scale-110"
                  />
                </Link>
              ))}
          </div>
          <Link
            href="/spots"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-amber-400/50 hover:text-amber-300"
          >
            {t("galleryCta")}
            <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      {/* ── 가이드북 배너 ── */}
      <section className="mt-16">
        <Link
          href="/etiquette"
          className="group relative flex flex-col items-start gap-5 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-950 via-violet-950 to-slate-950 px-7 py-10 transition hover:border-amber-400/40 sm:flex-row sm:items-center sm:px-12"
        >
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.35),transparent_70%)]" />
          <BookOpen size={34} className="relative shrink-0 text-amber-300" />
          <div className="relative flex-1">
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">
              {t("guidebookOverline")}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {t("guidebookTitle")}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {t("guidebookSubtitle")}
            </p>
          </div>
          <span className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 transition group-hover:bg-amber-300">
            {t("guidebookCta")}
            <ArrowRight size={16} />
          </span>
        </Link>
      </section>
    </div>
  );
}

/** 섹션 제목 + 오른쪽 전체보기 링크 */
function SectionHead({
  title,
  subtitle,
  href,
  linkLabel,
}: {
  title: string;
  subtitle: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>
      </div>
      <Link
        href={href}
        className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-400 transition hover:text-amber-300"
      >
        {linkLabel}
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}

/** 월간 소식 카드에 쓰는 "2026년 8월" / "August 2026" */
function monthLabel(locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
  }).format(new Date());
}
