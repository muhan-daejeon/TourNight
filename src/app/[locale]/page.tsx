import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { ArrowRight, MessageSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getVerifiedNightSpots } from "@/lib/spots";
import { getKtoOverview } from "@/lib/kto-live";
import { listNotices } from "@/lib/notices";
import { listPopularPosts, type CommunityPost } from "@/lib/community";
import IntroSequence from "@/components/IntroSequence";
import TonightBriefing from "@/components/TonightBriefing";
import FeatureShowcase from "@/components/FeatureShowcase";
import SpotShowcase, { type ShowcaseSpot } from "@/components/SpotShowcase";

// 야간 검증 스팟·커뮤니티 인기글 기준, 1시간 주기로 재생성
export const revalidate = 3600;

/**
 * 홈 — 팀이 승인한 라이트 시안(/draft) 구조를 정식 채택한 버전.
 * 밝은 바탕 + 대형 실사진 히어로 + 검색이 첫 행동 + 카테고리 숏컷 + 여백 많은
 * 카드 섹션. 그 뼈대 위에 우리 기능(오늘 밤 브리핑·성향 테스트·소식·커뮤니티·
 * SNS·가이드북)을 전부 연결한다.
 */
export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // 로그인·가입 직후 여기로 돌아올 때만 붙는 표식 — 인트로를 뺀 HTML을 내려준다
  const skipIntro = (await searchParams).skipIntro === "1";
  const t = await getTranslations("home");

  const [spots, popular] = await Promise.all([
    getVerifiedNightSpots(locale),
    listPopularPosts(4),
  ]);
  const notices = listNotices(locale);
  const photoSpots = spots.filter((s) => s.imageUrl);

  // 명소 캐러셀 카드에 쓸 소개문 — 상세 API에서 앞부분만 (1시간 캐시라 부담 없다)
  const showcaseSpots: ShowcaseSpot[] = await Promise.all(
    photoSpots.slice(0, 8).map(async (s) => ({
      contentId: s.contentId,
      title: s.title,
      addr: s.addr,
      imageUrl: s.imageUrl!,
      desc: await getKtoOverview(s.contentId, locale).catch(() => ""),
    })),
  );

  return (
    <div>
      <IntroSequence skipIntro={skipIntro} />

      {/* ── 히어로 — 대형 실사진 + 큰 카피 + 검색 (검색이 첫 행동) ── */}
      <section className="relative h-[480px] overflow-hidden sm:h-[540px]">
        <Image
          src="/hero-night.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
          <p className="text-xs font-semibold tracking-[0.25em] sm:text-sm">
            DREAM CITY DAEJEON
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)] sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">
            {t("heroSubtitle")}
          </p>
        </div>
      </section>


      {/* ── 🌙 오늘 밤 브리핑 — 메인 이미지 바로 아래 실시간 정보 한 줄 ── */}
      <section className="mx-auto max-w-7xl px-6 pt-7">
        <TonightBriefing />
      </section>

      {/* ── 투어나잇을 즐겨보세요 — 좌 텍스트 + 우 비주얼을 화살표로 넘기는
          쇼케이스 (성향 테스트 · 네컷사진 · K-Life) ── */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <FeatureShowcase />
      </section>

      {/* ── 오늘 밤, 어디로 갈까요? — 좌 제목·화살표 + 우 카드 캐러셀 ── */}
      {showcaseSpots.length > 0 && (
        <section className="bg-slate-50 py-16">
          <div className="mx-auto max-w-7xl px-6">
            <SpotShowcase spots={showcaseSpots} />
          </div>
        </section>
      )}

      {/* ── 소식 · 인기글 · SNS ── */}
      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div id="news" className="grid scroll-mt-24 gap-10 lg:grid-cols-[1.5fr_1fr_1fr]">
          {/* 투어나잇 소식 */}
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight">{t("newsSection")}</h2>
            <p className="mt-1.5 mb-5 text-sm text-slate-500">{t("newsSectionSub")}</p>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,206px)_minmax(0,1fr)]">
              {/* 월간 소식 카드 — 밤 사진을 쓰는 카드라 짙은 배경을 유지한다 */}
              <Link
                href="/festivals"
                className="group relative flex min-h-[230px] flex-col overflow-hidden rounded-2xl transition hover:shadow-lg"
              >
                <Image
                  src="/spots/jungangro-night.jpg"
                  alt=""
                  fill
                  sizes="206px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/55 to-slate-950/80" />
                <div className="relative flex-1 p-5">
                  <p className="text-[11px] font-bold tracking-wide text-indigo-200">
                    {monthLabel(locale)}
                  </p>
                  <p className="mt-2.5 text-[15px] font-extrabold leading-tight text-white">
                    Tour<span className="text-amber-300">Night</span>
                  </p>
                  <h3 className="text-lg font-extrabold leading-tight text-white">
                    {t("monthlyIssueTitle")}
                  </h3>
                  <p className="mt-2 text-[11px] leading-snug text-slate-300">
                    {t("monthlyIssueBlurb")}
                  </p>
                  <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-bold text-white backdrop-blur transition group-hover:bg-white group-hover:text-indigo-700">
                    {t("monthlyIssueCta")}
                    <ArrowRight size={12} />
                  </span>
                </div>
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
                      className="group flex gap-3 rounded-xl p-1.5 transition hover:bg-slate-50"
                    >
                      <div className="relative h-14 w-[86px] shrink-0 overflow-hidden rounded-lg bg-slate-200">
                        <Image src={n.image} alt="" fill sizes="86px" className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-[13px] font-bold text-slate-800 group-hover:text-indigo-600">
                          {n.title}
                        </h4>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500">
                          {n.summary}
                        </p>
                        <time dateTime={n.date} className="mt-1 block text-[11px] text-slate-400">
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
            <h2 className="text-xl font-bold tracking-tight">{t("popularSection")}</h2>
            <p className="mt-1.5 mb-5 text-sm text-slate-500">
              {t("popularSectionSub", { count: popular.length })}
            </p>
            {popular.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                {t("popularEmpty")}
              </p>
            ) : (
              <ol className="flex flex-col gap-4">
                {popular.map((post, i) => (
                  <li key={post.id}>
                    <Link
                      href="/community"
                      className="group flex items-start gap-3 rounded-xl p-1.5 transition hover:bg-slate-50"
                    >
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-[11px] font-extrabold text-indigo-600">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-slate-800 group-hover:text-indigo-600">
                          {postTitle(post)}
                        </p>
                        <p className="mt-1 flex items-center gap-2.5 text-[11px] text-slate-400">
                          {hashtags(post).length > 0 ? (
                            <span className="truncate text-indigo-500">
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
            <h2 className="text-xl font-bold tracking-tight">{t("snsSection")}</h2>
            <p className="mt-1.5 mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              @tournight_official
              <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                {t("snsPending")}
              </span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {photoSpots.slice(0, 6).map((s) => (
                <Link
                  key={s.contentId}
                  href={`/spots/${s.contentId}`}
                  aria-label={s.title}
                  className="relative aspect-square overflow-hidden rounded-lg bg-slate-200"
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
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
            >
              {t("galleryCta")}
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

      </section>
    </div>
  );
}

/** 인기글 제목 — 커뮤니티 글에는 제목 필드가 없어 본문에서 해시태그를 뺀 첫 줄을 쓴다 */
function postTitle(post: CommunityPost): string {
  const stripped = post.body.replace(/#[^\s#]+/g, "").replace(/\s+/g, " ").trim();
  return stripped || post.body;
}

/** 본문에 사용자가 직접 적은 해시태그만 뽑는다 (없으면 빈 배열 → 작성자를 대신 보여준다) */
function hashtags(post: CommunityPost): string[] {
  return (post.body.match(/#[^\s#]+/g) ?? []).slice(0, 2);
}

/** 월간 소식 카드에 쓰는 "2026년 9월" / "September 2026" */
function monthLabel(locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
  }).format(new Date());
}
