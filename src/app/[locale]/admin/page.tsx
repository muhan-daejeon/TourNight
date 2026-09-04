import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Activity,
  Sparkles,
  MessageCircle,
  Footprints,
  Search,
  MoonStar,
  Eye,
  ImageIcon,
  Flag,
  UserRound,
  Languages,
  Stamp,
} from "lucide-react";
import { sql } from "@/lib/db";
import { getVerifiedNightSpots } from "@/lib/spots";
import { listReports } from "@/lib/community";
import { getSessionUser } from "@/lib/session";
import { isAdmin, type ActivityAction } from "@/lib/activity";
import AdminRoleToggle from "@/components/AdminRoleToggle";
import AdminDeleteButton from "@/components/AdminDeleteButton";

// 팀 내부용 페이지 — 다국어 없이 한국어 고정, 항상 최신 데이터
export const dynamic = "force-dynamic";

const TABS = [
  { key: "overview", label: "개요" },
  { key: "courses", label: "코스 이용 현황" },
  { key: "community", label: "커뮤니티 관리" },
  { key: "users", label: "회원 관리" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/** 활동 종류별 한국어 라벨과 아이콘 */
const ACTION_META: Record<
  ActivityAction,
  { label: string; icon: typeof Activity }
> = {
  ai_course: { label: "AI 코스 짜기", icon: Sparkles },
  spot_view: { label: "명소 상세 열람", icon: Eye },
  etiquette: { label: "나이트 에티켓", icon: MoonStar },
  phrases: { label: "서바이벌 한국어", icon: Footprints },
  phrase_search: { label: "표현 검색", icon: Search },
  community_post: { label: "커뮤니티 글", icon: MessageCircle },
  community_comment: { label: "커뮤니티 댓글", icon: MessageCircle },
  community_report: { label: "커뮤니티 신고", icon: Flag },
  community_translate: { label: "커뮤니티 번역", icon: Languages },
  course_survey: { label: "맞춤 코스 설문", icon: Sparkles },
  personality_test: { label: "성향 테스트", icon: UserRound },
  stamp_tour_photo: { label: "도장투어 인증사진", icon: Stamp },
};

interface LogRow {
  id: number;
  action: ActivityAction;
  detail: Record<string, unknown>;
  created_at: string;
  nickname: string | null;
}

/** detail을 사람이 읽는 한 줄로 (스팟 id는 이름으로 치환) */
function describe(row: LogRow, titles: Map<string, string>): string {
  const d = row.detail;
  const name = (id: unknown) => titles.get(String(id)) ?? String(id);
  switch (row.action) {
    case "ai_course": {
      const anchors = Array.isArray(d.anchors) ? d.anchors.map(name) : [];
      const parts = [anchors.join(" + ")];
      if (d.category) parts.push(`${d.category} 위주`);
      if (d.cached) parts.push("캐시");
      return parts.filter(Boolean).join(" · ");
    }
    case "spot_view":
      return name(d.contentId);
    case "etiquette":
      return `${d.topic}`;
    case "phrases":
      return `표현집 열람 (${d.locale})`;
    case "phrase_search":
      return `"${d.query}"`;
    case "community_post":
      return d.hasPhoto ? "사진 포함 글 작성" : "글 작성";
    case "community_comment":
      return `댓글 작성 (#${d.postId})`;
    case "personality_test":
      return `${d.primary}${d.secondary ? ` / ${d.secondary}` : ""}`;
    default:
      return "";
  }
}

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "방금 전";
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  return `${Math.floor(sec / 86400)}일 전`;
}

/** 로그 detail에 등장한 스팟 id들을 이름으로 바꿀 맵 */
async function titleMap(rows: LogRow[]): Promise<Map<string, string>> {
  const ids = new Set<string>();
  for (const r of rows) {
    if (Array.isArray(r.detail.anchors))
      r.detail.anchors.forEach((a) => ids.add(String(a)));
    if (r.detail.contentId) ids.add(String(r.detail.contentId));
  }
  if (!ids.size) return new Map();
  // 명소 이름은 KTO 실시간 목록에서 찾는다 (저장분을 쓰지 않는다)
  const spots = await getVerifiedNightSpots("ko");
  return new Map(
    spots.filter((s) => ids.has(s.contentId)).map((s) => [s.contentId, s.title]),
  );
}

/* ---------- 탭별 내용 ---------- */

async function OverviewTab() {
  const [totals, byAction, recent] = await Promise.all([
    sql<{ users: number; today: number }[]>`
      select
        (select count(*)::int from users) as users,
        (select count(*)::int from activity_log where created_at > now() - interval '1 day') as today
    `,
    sql<{ action: ActivityAction; c: number }[]>`
      select action, count(*)::int c from activity_log
      where created_at > now() - interval '7 days'
      group by action order by c desc
    `,
    sql<LogRow[]>`
      select a.id, a.action, a.detail, a.created_at, u.nickname
      from activity_log a left join users u on u.id = a.user_id
      order by a.created_at desc limit 40
    `,
  ]);
  const titles = await titleMap(recent);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users size={13} /> 전체 회원
          </p>
          <p className="mt-1 text-2xl font-bold">{totals[0].users}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Activity size={13} /> 24시간 활동
          </p>
          <p className="mt-1 text-2xl font-bold">{totals[0].today}</p>
        </div>
        {byAction.slice(0, 2).map((a) => (
          <div
            key={a.action}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <p className="text-xs text-slate-400">
              최근 7일 · {ACTION_META[a.action]?.label ?? a.action}
            </p>
            <p className="mt-1 text-2xl font-bold">{a.c}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold">기능별 사용량 (최근 7일)</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {byAction.length === 0 && (
            <p className="text-sm text-slate-500">아직 기록이 없어요.</p>
          )}
          {byAction.map((a) => {
            const meta = ACTION_META[a.action];
            const Icon = meta?.icon ?? Activity;
            return (
              <span
                key={a.action}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200"
              >
                <Icon size={13} className="text-amber-300" />
                {meta?.label ?? a.action}
                <b className="text-amber-300">{a.c}</b>
              </span>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">최근 활동</h2>
        <ol className="mt-3 space-y-2">
          {recent.length === 0 && (
            <p className="text-sm text-slate-500">아직 기록이 없어요.</p>
          )}
          {recent.map((r) => {
            const meta = ACTION_META[r.action];
            const Icon = meta?.icon ?? Activity;
            return (
              <li
                key={r.id}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
              >
                <Icon size={15} className="mt-0.5 shrink-0 text-amber-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200">
                    <b>{r.nickname ?? "(탈퇴)"}</b>
                    <span className="mx-1.5 text-slate-500">·</span>
                    {meta?.label ?? r.action}
                  </p>
                  <p className="truncate text-[13px] text-slate-400">
                    {describe(r, titles)}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-slate-500">
                  {timeAgo(r.created_at)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}

async function CoursesTab() {
  const [summary, popular, logs] = await Promise.all([
    sql<{ total: number; users: number; fresh: number }[]>`
      select count(*)::int total,
             count(distinct user_id)::int users,
             count(*) filter (where (detail->>'cached') = 'false')::int fresh
      from activity_log where action = 'ai_course'
    `,
    // 코스에 가장 많이 담긴 명소 top 8
    sql<{ id: string; c: number }[]>`
      select jsonb_array_elements_text(detail->'anchors') as id, count(*)::int c
      from activity_log where action = 'ai_course'
      group by 1 order by c desc limit 8
    `,
    sql<LogRow[]>`
      select a.id, a.action, a.detail, a.created_at, u.nickname
      from activity_log a left join users u on u.id = a.user_id
      where a.action = 'ai_course'
      order by a.created_at desc limit 100
    `,
  ]);
  const titles = await titleMap(logs);
  const popularIds = popular.map((p) => p.id);
  const popularTitles = popularIds.length
    ? new Map(
        (await getVerifiedNightSpots("ko"))
          .filter((s) => popularIds.includes(s.contentId))
          .map((s) => [s.contentId, s.title]),
      )
    : new Map<string, string>();

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ["총 코스 요청", summary[0].total],
            ["이용 사용자", summary[0].users],
            ["새로 생성(캐시 제외)", summary[0].fresh],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold">많이 담긴 명소</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {popular.length === 0 && (
            <p className="text-sm text-slate-500">아직 기록이 없어요.</p>
          )}
          {popular.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200"
            >
              {popularTitles.get(p.id) ?? p.id}
              <b className="text-amber-300">{p.c}</b>
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">코스 생성 기록</h2>
        <ol className="mt-3 space-y-2">
          {logs.length === 0 && (
            <p className="text-sm text-slate-500">아직 기록이 없어요.</p>
          )}
          {logs.map((r) => (
            <li
              key={r.id}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
            >
              <Sparkles size={15} className="mt-0.5 shrink-0 text-amber-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <b className="text-slate-100">{r.nickname ?? "(탈퇴)"}</b>
                  {r.detail.cached ? (
                    <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-400">
                      캐시
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-[13px] text-slate-300">
                  {describe(r, titles)}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-slate-500">
                {timeAgo(r.created_at)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

async function CommunityTab() {
  const [posts, comments, reports] = await Promise.all([
    sql<
      {
        id: number;
        author: string;
        body: string;
        created_at: string;
        media_path: string | null;
        comments: number;
      }[]
    >`
      select p.id, p.author, p.body, p.created_at, p.media_path,
             (select count(*)::int from community_comments c where c.post_id = p.id) as comments
      from community_posts p
      order by p.created_at desc limit 50
    `,
    sql<
      {
        id: number;
        post_id: number;
        author: string;
        body: string;
        created_at: string;
      }[]
    >`
      select id, post_id, author, body, created_at
      from community_comments order by created_at desc limit 50
    `,
    listReports(30),
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* 신고 — 관리자가 제일 먼저 봐야 할 것이라 맨 위에 폭 전체로 둔다 */}
      <section className="lg:col-span-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Flag size={16} className="text-rose-400" />
          신고 ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">접수된 신고가 없어요.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {reports.map((r) => (
              <li
                key={`${r.targetType}-${r.targetId}`}
                className="rounded-xl border border-rose-400/20 bg-rose-400/[0.04] px-3.5 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-rose-400/20 px-2 py-0.5 text-[11px] font-bold text-rose-200">
                    {r.reportCount}건
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {r.targetType === "post" ? "글" : "댓글"} #{r.targetId}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {r.reasons.join(", ")}
                  </span>
                  {r.body === null && (
                    <span className="text-[11px] text-slate-600">
                      (원본 삭제됨)
                    </span>
                  )}
                </div>
                {r.body !== null && (
                  <>
                    <p className="mt-1.5 text-xs text-slate-500">{r.author}</p>
                    <p className="mt-0.5 break-words text-sm text-slate-200">
                      {r.body}
                    </p>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold">글 ({posts.length})</h2>
        <ol className="mt-3 space-y-2">
          {posts.length === 0 && (
            <p className="text-sm text-slate-500">아직 글이 없어요.</p>
          )}
          {posts.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
            >
              <div className="flex items-center gap-1.5">
                <b className="text-sm text-slate-100">{p.author}</b>
                {p.media_path && (
                  <ImageIcon size={12} className="text-amber-300" />
                )}
                <span className="text-[11px] text-slate-500">
                  #{p.id} · 댓글 {p.comments} · {timeAgo(p.created_at)}
                </span>
                <span className="ml-auto">
                  <AdminDeleteButton
                    url={`/api/community/${p.id}`}
                    label={`${p.author}님의 글`}
                  />
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-300">
                {p.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-bold">댓글 ({comments.length})</h2>
        <ol className="mt-3 space-y-2">
          {comments.length === 0 && (
            <p className="text-sm text-slate-500">아직 댓글이 없어요.</p>
          )}
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
            >
              <div className="flex items-center gap-1.5">
                <b className="text-sm text-slate-100">{c.author}</b>
                <span className="text-[11px] text-slate-500">
                  글 #{c.post_id} · {timeAgo(c.created_at)}
                </span>
                <span className="ml-auto">
                  <AdminDeleteButton
                    url={`/api/community/${c.post_id}/comments/${c.id}`}
                    label={`${c.author}님의 댓글`}
                  />
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-300">
                {c.body}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

async function UsersTab({ selfId }: { selfId: number }) {
  const byUser = await sql<
    {
      id: string;
      nickname: string;
      email: string;
      role: string;
      last_active: string | null;
      actions: number;
      courses: number;
      community: number;
    }[]
  >`
    select u.id, u.nickname, u.email, u.role,
      max(a.created_at) as last_active,
      count(a.id)::int as actions,
      count(a.id) filter (where a.action = 'ai_course')::int as courses,
      count(a.id) filter (where a.action like 'community%')::int as community
    from users u left join activity_log a on a.user_id = u.id
    group by u.id order by last_active desc nulls last
  `;

  return (
    <section>
      <h2 className="text-lg font-bold">회원 ({byUser.length})</h2>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {byUser.map((u) => (
          <li
            key={u.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
          >
            <p className="flex items-center gap-1.5 text-sm">
              <b className="truncate text-slate-100">{u.nickname}</b>
              {u.role === "admin" && (
                <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                  관리자
                </span>
              )}
              <span className="ml-auto">
                {/* bigint가 문자열로 올 수 있어 숫자로 맞춰 비교한다 */}
                <AdminRoleToggle
                  userId={Number(u.id)}
                  role={u.role === "admin" ? "admin" : "user"}
                  isSelf={Number(u.id) === selfId}
                />
              </span>
            </p>
            <p className="truncate text-[12px] text-slate-500">{u.email}</p>
            <p className="mt-1 text-[12px] text-slate-400">
              활동 {u.actions}회 (코스 {u.courses} · 커뮤니티 {u.community})
              <span className="mx-1.5 text-slate-600">·</span>
              {u.last_active ? timeAgo(u.last_active) : "활동 없음"}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- 페이지 ---------- */

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // 관리자만 — 아니면 홈으로 (페이지 존재 자체를 드러내지 않는다)
  const session = await getSessionUser();
  if (!session || !(await isAdmin(session.userId))) {
    redirect(`/${locale}`);
  }

  const rawTab = (await searchParams).tab;
  const tab: TabKey = TABS.some((t) => t.key === rawTab)
    ? (rawTab as TabKey)
    : "overview";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="overline-label">Admin</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">관리자 대시보드</h1>
      <p className="mt-2 text-sm text-slate-400">
        사용자들이 어떤 기능을 어떻게 쓰는지 봅니다. 팀 내부용 페이지입니다.
      </p>

      {/* 탭 — 서버 렌더 링크라 탭마다 필요한 데이터만 읽는다 */}
      <nav className="mt-6 flex gap-1.5 overflow-x-auto border-b border-white/10 pb-px">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/${locale}/admin?tab=${t.key}`}
            className={`shrink-0 rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "border-b-2 border-amber-400 text-amber-300"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "overview" && <OverviewTab />}
        {tab === "courses" && <CoursesTab />}
        {tab === "community" && <CommunityTab />}
        {tab === "users" && <UsersTab selfId={session.userId} />}
      </div>
    </div>
  );
}
