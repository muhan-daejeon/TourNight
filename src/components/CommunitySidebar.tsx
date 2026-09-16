import { getTranslations } from "next-intl/server";
import { Flame, MessageCircle, MapPin, Camera, Users, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { CommunityPost } from "@/lib/community";
import type { NightSpot } from "@/lib/kto";

/** 최근 7일 통계 — 렌더 밖에서 계산한다 (컴포넌트 안의 Date.now()는 순수성 규칙에 걸린다) */
function weekStats(posts: CommunityPost[]) {
  const week = Date.now() - 7 * 24 * 3600 * 1000;
  const recent = posts.filter((p) => new Date(p.createdAt).getTime() >= week);
  return {
    posts: recent.length,
    comments: recent.reduce((n, p) => n + p.commentCount, 0),
    photos: recent.filter((p) => p.mediaUrl).length,
    authors: new Set(recent.map((p) => p.author)).size,
  };
}

/**
 * 커뮤니티 사이드바 — 글 목록만 있던 화면에 둘러볼 거리를 붙인다.
 * 인기글 · 이번 주 통계 · 글에서 자주 언급된 명소. 데이터는 이미 받은
 * 글 목록과 명소 목록에서 계산하므로 추가 조회가 없다.
 */
export default async function CommunitySidebar({
  popular,
  posts,
  spots,
}: {
  popular: CommunityPost[];
  posts: CommunityPost[];
  spots: NightSpot[];
}) {
  const t = await getTranslations("community.sidebar");
  const stats = weekStats(posts);

  // 명소별 언급 횟수 — 글의 방문 명소 태그가 1순위(정확), 본문에 이름이
  // 그대로 들어간 경우가 2순위(태그 없던 옛 글 대비). 한 글은 한 번만 센다.
  // 짧은 이름(2자)은 본문 매칭 오탐이 많아 텍스트 쪽에서만 뺀다
  const mentioned = spots
    .map((s) => ({
      spot: s,
      n: posts.filter(
        (p) =>
          (p.contentIds ?? []).includes(s.contentId) ||
          (s.title.length >= 3 && p.body.includes(s.title)),
      ).length,
    }))
    .filter((m) => m.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  const excerpt = (body: string) =>
    body.replace(/#[^\s#]+/g, "").replace(/\s+/g, " ").trim().slice(0, 40);

  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      {/* 인기글 */}
      <section className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Flame size={15} className="text-amber-600" />
          {t("popular")}
        </h2>
        {popular.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">{t("popularEmpty")}</p>
        ) : (
          <ol className="mt-3 space-y-2.5">
            {popular.map((p, i) => (
              <li key={p.id} className="flex gap-2.5">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-extrabold text-amber-600">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-slate-900">{excerpt(p.body)}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="truncate">{p.author}</span>
                    <span className="flex shrink-0 items-center gap-0.5">
                      <MessageCircle size={10} />
                      {p.commentCount}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* 이번 주 */}
      <section className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Sparkles size={15} className="text-indigo-600" />
          {t("thisWeek")}
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
          {[
            [MessageCircle, stats.posts, t("statPosts")],
            [MessageCircle, stats.comments, t("statComments")],
            [Camera, stats.photos, t("statPhotos")],
            [Users, stats.authors, t("statAuthors")],
          ].map(([Icon, n, label], i) => {
            const I = Icon as typeof Users;
            return (
              <div key={i} className="rounded-xl bg-slate-100 px-2 py-3">
                <I size={13} className="mx-auto text-slate-500" />
                <dd className="mt-1 text-lg font-extrabold text-slate-900">{n as number}</dd>
                <dt className="text-[11px] text-slate-500">{label as string}</dt>
              </div>
            );
          })}
        </dl>
      </section>

      {/* 자주 언급된 명소 */}
      {mentioned.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <MapPin size={15} className="text-emerald-600" />
            {t("mentioned")}
          </h2>
          <ul className="mt-3 space-y-1.5">
            {mentioned.map(({ spot, n }) => (
              <li key={spot.contentId}>
                <Link
                  href={`/spots/${spot.contentId}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[13px] text-slate-400 transition hover:bg-slate-100 hover:text-amber-600"
                >
                  <span className="truncate">{spot.title}</span>
                  <span className="shrink-0 text-[11px] text-slate-500">{t("mentionCount", { n })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 가이드 */}
      <section className="rounded-2xl border border-amber-400 bg-white p-4">
        <h2 className="text-sm font-bold text-amber-600">{t("guideTitle")}</h2>
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-slate-400">
          <li>· {t("guide1")}</li>
          <li>· {t("guide2")}</li>
          <li>· {t("guide3")}</li>
        </ul>
      </section>
    </aside>
  );
}
