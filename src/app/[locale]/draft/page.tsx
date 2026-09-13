import { setRequestLocale } from "next-intl/server";
import Image from "next/image";
import {
  ArrowRight,
  Bike,
  CalendarDays,
  Camera,
  Compass,
  Landmark,
  Moon,
  Search,
  Sparkles,
  Train,
  UtensilsCrossed,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getVerifiedNightSpots, pickFestivals } from "@/lib/spots";
import { withPeriods } from "@/lib/festivals";
import { getNightConditions } from "@/lib/conditions";

export const revalidate = 3600;

/**
 * [팀 회의용 초안] 라이트 테마 리디자인 시안 — /draft
 *
 * 관광 포털의 일반적 편집 문법(밝은 배경 + 대형 실사진 히어로 + 검색 중심 +
 * 카테고리 숏컷 + 여백 많은 카드 섹션)을 우리 콘텐츠·브랜드로 구성해 본 것.
 * 특정 사이트의 에셋·아이덴티티를 복제하지 않는다 — 구조와 밀도만 그 장르의
 * 관행을 따른다. 기존 다크 디자인은 건드리지 않는 별도 라우트라, 팀이 나란히
 * 열어 두고 비교·결정하면 된다. (전역 다크 헤더가 위에 남는 것은 초안 한계 —
 * 이 페이지 안의 흰 헤더가 시안의 헤더다)
 */
export default async function DraftPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [spots, conditions] = await Promise.all([
    getVerifiedNightSpots(locale),
    getNightConditions(),
  ]);
  const festivals = (await withPeriods(pickFestivals(spots))).slice(0, 4);
  const photoSpots = spots.filter((s) => s.imageUrl);
  const [feature, ...rest] = photoSpots;
  const gridSpots = rest.slice(0, 6);

  const CATS = [
    { Icon: Moon, label: "야간 명소", href: "/spots" },
    { Icon: Sparkles, label: "축제·행사", href: "/festivals" },
    { Icon: Compass, label: "추천 코스", href: "/courses" },
    { Icon: UtensilsCrossed, label: "K-Life 가이드", href: "/klife/restaurant" },
    { Icon: Landmark, label: "성향 테스트", href: "/personality" },
    { Icon: Camera, label: "도장투어", href: "/stamp-tour" },
  ] as const;

  return (
    <div className="bg-white text-slate-900">
      {/* ── 초안 표시 ── */}
      <div className="bg-slate-900 px-4 py-1.5 text-center text-xs font-semibold text-amber-300">
        [팀 회의용 초안] 라이트 테마 시안 — 기존 사이트는 그대로 있습니다
      </div>

      {/* ── 시안 헤더 — 흰 배경, 얇은 유틸리티 줄 + 수평 메뉴 ── */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-5">
          <span className="text-2xl font-extrabold tracking-tight">
            Tour<span className="text-indigo-600">Night</span>
          </span>
          <nav className="hidden items-center gap-7 text-[15px] font-semibold text-slate-700 lg:flex">
            <span className="cursor-pointer hover:text-indigo-600">둘러보기</span>
            <span className="cursor-pointer hover:text-indigo-600">여행 가이드</span>
            <span className="cursor-pointer hover:text-indigo-600">나이트 라이프</span>
            <span className="cursor-pointer hover:text-indigo-600">커뮤니티</span>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
            <Search size={18} />
            <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold">
              KR
            </span>
          </div>
        </div>
      </header>

      {/* ── 히어로 — 대형 실사진 + 큰 카피 + 검색바 ── */}
      <section className="relative h-[520px] overflow-hidden">
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
          <p className="text-sm font-semibold tracking-[0.25em]">DAEJEON NIGHT TRAVEL</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight drop-shadow sm:text-5xl">
            대전의 밤은
            <br className="sm:hidden" /> 낮보다 빛난다
          </h1>
          {/* 검색이 첫 행동이 되는 포털 문법 */}
          <div className="mt-8 flex w-full max-w-xl items-center gap-2 rounded-full bg-white p-2 pl-5 shadow-xl">
            <Search size={18} className="shrink-0 text-slate-400" />
            <span className="flex-1 text-left text-sm text-slate-400">
              오늘 밤 가고 싶은 곳을 검색해보세요
            </span>
            <span className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white">
              검색
            </span>
          </div>
        </div>
      </section>

      {/* ── 카테고리 숏컷 — 아이콘 원형 줄 ── */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid grid-cols-3 gap-6 sm:grid-cols-6">
          {CATS.map(({ Icon, label, href }) => (
            <Link key={label} href={href} className="group flex flex-col items-center gap-2.5">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition group-hover:bg-indigo-600 group-hover:text-white">
                <Icon size={24} strokeWidth={1.8} />
              </span>
              <span className="text-[13px] font-semibold text-slate-700">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 오늘 밤 스트립 — 우리 차별점은 라이트에서도 유지 ── */}
      {conditions && (
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 py-4 text-sm text-slate-600">
            <span className="font-bold text-indigo-700">오늘 밤 대전</span>
            {conditions.temp !== null && <span>🌡 {conditions.temp}°C</span>}
            <span>🌇 일몰 {conditions.sunset}</span>
            <span>
              {conditions.moonEmoji} 월령 {Math.round(conditions.lunAge)}일
            </span>
            <span className="flex items-center gap-1.5">
              <Train size={15} /> 막차 23:35
            </span>
            <span className="flex items-center gap-1.5">
              <Bike size={15} /> 타슈 실시간
            </span>
          </div>
        </section>
      )}

      {/* ── 이번 주 축제 — 포스터 카드 4장 ── */}
      {festivals.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-indigo-600">
                <CalendarDays size={16} /> WHAT&apos;S ON
              </p>
              <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight">
                지금 대전의 밤은
              </h2>
            </div>
            <Link
              href="/festivals"
              className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-indigo-600"
            >
              더보기 <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {festivals.map((f) => (
              <Link key={f.contentId} href={`/spots/${f.contentId}`} className="group">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-100">
                  {f.imageUrl && (
                    <Image
                      src={f.imageUrl}
                      alt={f.title}
                      fill
                      sizes="(min-width:1024px) 25vw, 50vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <h3 className="mt-3 line-clamp-1 text-[15px] font-bold group-hover:text-indigo-600">
                  {f.title}
                </h3>
                <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{f.addr}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 야간 명소 — 대형 피처 1 + 그리드, 사진이 주인공 ── */}
      {feature && (
        <section className="bg-slate-50 py-16">
          <div className="mx-auto max-w-7xl px-6">
            <h2 className="text-3xl font-extrabold tracking-tight">오늘 밤, 어디로 갈까요?</h2>
            <p className="mt-2 text-slate-500">투어나잇이 검증한 대전 야경 명소</p>
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <Link href={`/spots/${feature.contentId}`} className="group relative block overflow-hidden rounded-2xl">
                <div className="relative h-[420px]">
                  <Image
                    src={feature.imageUrl!}
                    alt={feature.title}
                    fill
                    sizes="(min-width:1024px) 55vw, 100vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 p-7 text-white">
                    <h3 className="text-2xl font-extrabold">{feature.title}</h3>
                    <p className="mt-1 text-sm text-white/80">{feature.addr}</p>
                  </div>
                </div>
              </Link>
              <div className="grid grid-cols-2 gap-4">
                {gridSpots.slice(0, 4).map((s) => (
                  <Link key={s.contentId} href={`/spots/${s.contentId}`} className="group">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-200">
                      <Image
                        src={s.imageUrl!}
                        alt={s.title}
                        fill
                        sizes="25vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                    <h3 className="mt-2 line-clamp-1 text-sm font-bold group-hover:text-indigo-600">
                      {s.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 성향 테스트 배너 — 넓은 여백의 단색 CTA ── */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-indigo-600 px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-extrabold">나의 야간 여행성향은?</h2>
          <p className="max-w-xl text-indigo-100">
            12개의 질문으로 나에게 딱 맞는 대전의 밤을 찾아보세요. 성향에 맞는
            야간 코스까지 추천해 드려요.
          </p>
          <Link
            href="/personality"
            className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
          >
            테스트 시작하기 →
          </Link>
        </div>
      </section>

      {/* ── 시안 푸터 ── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm text-slate-400">
          <span className="text-lg font-extrabold text-slate-700">
            Tour<span className="text-indigo-600">Night</span>
          </span>
          <span>대전의 밤을 여행하다 · 라이트 테마 시안 (팀 회의용)</span>
        </div>
      </footer>
    </div>
  );
}
