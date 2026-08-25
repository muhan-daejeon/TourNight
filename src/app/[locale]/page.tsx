import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { ArrowRight, MessageSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getVerifiedNightSpots } from "@/lib/spots";
import { listNotices } from "@/lib/notices";
import { listPopularPosts, type CommunityPost } from "@/lib/community";
import NightInfo from "@/components/NightInfo";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";
import IntroSequence from "@/components/IntroSequence";
import ScrollDownHint from "@/components/ScrollDownHint";
import GuidebookBanner from "@/components/GuidebookBanner";
import SnapScreens from "@/components/SnapScreens";

// 야간 검증 스팟·커뮤니티 인기글 기준, 1시간 주기로 재생성
export const revalidate = 3600;

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
    listPopularPosts(3),
  ]);
  const notices = listNotices(locale).slice(0, 2);
  const photoSpots = spots.filter((s) => s.imageUrl);

  // 배너 배경 사진 — 등록된 명소 사진을 순서대로 돌려 쓴다. 무작위로 뽑으면
  // 정적 생성 결과가 매번 달라져 배포마다 배너가 바뀐다
  const nthPhoto = (n: number) =>
    photoSpots.length
      ? photoSpots[n % photoSpots.length].imageUrl!
      : "/hero-night.jpg";

  // 히어로: 축제 → 서비스 소개 → AI 코스.
  //
  // 축제에 '지금 열린다/곧 열린다'를 붙이지 않는다. 개최 일정을 주는 출처가
  // KTO searchFestival2뿐인데 키가 막혀 있어, 확인 못 한 시기를 단정하면 안 된다.
  const slides: HeroSlide[] = [
    // 여행성향 테스트 — 메인에서 바로 시작하는 진입점 (기획 목업의 대표 히어로)
    {
      id: "persona",
      overline: t("heroPersonaOverline"),
      title: t("heroPersonaTitle"),
      highlight: t("heroPersonaHighlight"),
      subtitle: t("heroPersonaSubtitle"),
      ctaLabel: t("heroPersonaCta"),
      href: "/personality",
      gradient: "from-indigo-950 via-purple-950 to-slate-950",
      image: nthPhoto(1),
    },
    // 축제 명소 — 특정 축제 데이터가 아니라 축제&행사 탭으로 안내하는 고정 배너
    {
      id: "festivals",
      overline: t("heroFestivalOverline"),
      title: t("heroFestivalTitle"),
      subtitle: t("heroFestivalSubtitle"),
      ctaLabel: t("heroFestivalCta"),
      href: "/festivals",
      gradient: "from-fuchsia-950 via-purple-950 to-slate-950",
      image: nthPhoto(2),
    },
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
      // 앞 축제 배너와 겹치지 않게 뒤쪽 사진에서 고른다
      image: nthPhoto(photoSpots.length - 1),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-4">
      <IntroSequence />

      {/* 화면 1: 슬라이드 배너 / 화면 2: 소식·인기글·SNS + 가이드북 —
          휠로 넘길 때 다음 화면으로 전환되는 느낌을 주는 스냅 컨테이너 */}
      <SnapScreens>
        <section className="relative min-h-screen">
          {/* 슬라이드는 (헤더 밑) 화면 정중앙 — 가로·세로 모두.
              --header-h는 로고+메뉴 "행" 자신의 높이만 담고 있고, 실제 헤더는
              그 위에 같은 높이의 여백까지 더해 총 2배 높이를 차지한다 — 그래서
              여기서도 2배를 뺀다. 이 section 자체는 이미 헤더 바로 아래에서
              시작하므로, 안쪽 박스는 거기서부터 "보이는 화면 높이"만큼만 잡아야
              가운데가 실제로 보이는 영역의 가운데와 맞는다. 오늘 밤 정보·스크롤
              화살표는 그 박스 맨 아래에 겹쳐 띄워, 슬라이드 자체의 중앙 계산엔
              끼어들지 않는다 — 다만 화면이 낮으면 그 둘이 슬라이드 아래쪽과
              부딪혀서, 슬라이드를 정중앙보다 살짝 위로 올려 여유를 둔다 */}
          <div
            className="absolute inset-x-0 top-0"
            style={{ height: "calc(100vh - (var(--header-h, 0px) * 2))" }}
          >
            <div className="absolute inset-0 flex items-center justify-center px-4">
              <div style={{ transform: "translateY(-40px)" }}>
                <HeroCarousel slides={slides} />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-2 px-4">
              {/* 오늘 밤 정보 — 천문연구원 일몰·월령 */}
              <NightInfo />
              <ScrollDownHint />
            </div>
          </div>
        </section>

        <section id="content" className="pt-10">
          <div
            id="news"
            className="grid scroll-mt-24 gap-10 lg:grid-cols-[1.5fr_1fr_1fr]"
          >
        {/* 투어나잇 소식 */}
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">
            {t("newsSection")}
          </h2>
          <p className="mt-1.5 mb-5 text-sm text-slate-400">
            {t("newsSectionSub")}
          </p>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,206px)_minmax(0,1fr)]">
            {/* 월간 소식 카드 — 시안의 월간 뉴스레터 자리 */}
            <Link
              href="/festivals"
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-indigo-900 via-violet-950 to-slate-950 transition hover:border-amber-400/40"
            >
              <div className="pointer-events-none absolute inset-x-0 -top-14 h-36 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.2),transparent_70%)]" />
              <div className="relative flex-1 p-5">
                <p className="text-[11px] font-bold tracking-wide text-violet-200">
                  {monthLabel(locale)}
                </p>
                <p className="mt-2.5 text-[15px] font-extrabold leading-tight text-white">
                  Tour<span className="text-amber-400">Night</span>
                </p>
                <h3 className="text-lg font-extrabold leading-tight text-white">
                  {t("monthlyIssueTitle")}
                </h3>
                <p className="mt-2 text-[11px] leading-snug text-slate-300">
                  {t("monthlyIssueBlurb")}
                </p>
                <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-bold text-white backdrop-blur transition group-hover:bg-amber-400 group-hover:text-slate-950">
                  {t("monthlyIssueCta")}
                  <ArrowRight size={12} />
                </span>
              </div>
              {/* 카드 아래를 야경 사진으로 마감 — 시안의 뉴스레터 카드와 같은 구성 */}
              <div className="relative h-20 w-full">
                <Image
                  src="/hero-night.jpg"
                  alt=""
                  fill
                  sizes="206px"
                  className="object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-slate-950/80" />
              </div>
            </Link>

            {/* 최근 소식 3건 */}
            <ul className="flex flex-col gap-3">
              {notices.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    className="group flex gap-3 rounded-xl p-1.5 transition hover:bg-white/[0.04]"
                  >
                    <div className="relative h-14 w-[86px] shrink-0 overflow-hidden rounded-lg bg-slate-900">
                      <Image
                        src={n.image}
                        alt=""
                        fill
                        sizes="86px"
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
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">
            {t("popularSection")}
          </h2>
          <p className="mt-1.5 mb-5 text-sm text-slate-400">
            {t("popularSectionSub", { count: popular.length })}
          </p>
          {popular.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
              {t("popularEmpty")}
            </p>
          ) : (
            <ol className="flex flex-col gap-4">
              {popular.map((post, i) => (
                <li key={post.id}>
                  <Link
                    href="/community"
                    className="group flex items-start gap-3 rounded-xl p-1.5 transition hover:bg-white/[0.04]"
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[11px] font-extrabold text-amber-300">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-slate-100 group-hover:text-amber-300">
                        {postTitle(post)}
                      </p>
                      <p className="mt-1 flex items-center gap-2.5 text-[11px] text-slate-500">
                        {hashtags(post).length > 0 ? (
                          <span className="truncate text-indigo-300">
                            {hashtags(post).join(" ")}
                          </span>
                        ) : (
                          <span className="truncate">{post.author}</span>
                        )}
                        <span className="ml-auto flex shrink-0 items-center gap-1">
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

        {/* SNS — 계정 개설 전이라 링크는 걸지 않고, 사진은 등록된 야경 명소로 채운다 */}
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">
            {t("snsSection")}
          </h2>
          <p className="mt-1.5 mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            @tournight_official
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {t("snsPending")}
            </span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {photoSpots.slice(0, 3).map((s) => (
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
          </div>

          {/* ── 가이드북 배너 ── */}
          <div className="mt-14">
            <GuidebookBanner />
          </div>
        </section>
      </SnapScreens>
    </div>
  );
}

/** 인기글 제목 — 커뮤니티 글에는 제목 필드가 없어 본문에서 해시태그를 뺀 첫 줄을 쓴다 */
function postTitle(post: CommunityPost): string {
  const stripped = post.body
    .replace(/#[^\s#]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || post.body;
}

/** 본문에 사용자가 직접 적은 해시태그만 뽑는다 (없으면 빈 배열 → 작성자를 대신 보여준다) */
function hashtags(post: CommunityPost): string[] {
  return (post.body.match(/#[^\s#]+/g) ?? []).slice(0, 2);
}

/** 월간 소식 카드에 쓰는 "2026년 8월" / "August 2026" */
function monthLabel(locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
  }).format(new Date());
}
