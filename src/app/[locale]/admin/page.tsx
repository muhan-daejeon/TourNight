import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import {
  Users,
  Activity,
  Sparkles,
  MessageCircle,
  Footprints,
  Search,
  MoonStar,
  Eye,
} from "lucide-react";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { isAdmin, type ActivityAction } from "@/lib/activity";
import AdminRoleToggle from "@/components/AdminRoleToggle";

// 팀 내부용 페이지 — 다국어 없이 한국어 고정, 항상 최신 데이터
export const dynamic = "force-dynamic";

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
};

interface LogRow {
  id: number;
  action: ActivityAction;
  detail: Record<string, unknown>;
  created_at: string;
  nickname: string | null;
  email: string | null;
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

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // 관리자만 — 아니면 홈으로 (페이지 존재 자체를 드러내지 않는다)
  const session = await getSessionUser();
  if (!session || !(await isAdmin(session.userId))) {
    redirect(`/${locale}`);
  }

  const [totals, byAction, recent, byUser] = await Promise.all([
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
      select a.id, a.action, a.detail, a.created_at, u.nickname, u.email
      from activity_log a left join users u on u.id = a.user_id
      order by a.created_at desc limit 60
    `,
    sql<
      {
        id: number;
        nickname: string;
        email: string;
        role: string;
        joined: string;
        last_active: string | null;
        actions: number;
        courses: number;
        community: number;
      }[]
    >`
      select u.id, u.nickname, u.email, u.role, u.created_at as joined,
        max(a.created_at) as last_active,
        count(a.id)::int as actions,
        count(a.id) filter (where a.action = 'ai_course')::int as courses,
        count(a.id) filter (where a.action like 'community%')::int as community
      from users u left join activity_log a on a.user_id = u.id
      group by u.id order by last_active desc nulls last
    `,
  ]);

  // 로그에 등장한 스팟 id → 이름 (AI 코스 앵커, 상세 열람)
  const spotIds = new Set<string>();
  for (const r of recent) {
    if (Array.isArray(r.detail.anchors))
      r.detail.anchors.forEach((a) => spotIds.add(String(a)));
    if (r.detail.contentId) spotIds.add(String(r.detail.contentId));
  }
  const titleRows = spotIds.size
    ? await sql<{ content_id: string; title: string }[]>`
        select content_id, title from night_spots
        where content_id = any(${[...spotIds]})
      `
    : [];
  const titles = new Map(titleRows.map((t) => [t.content_id, t.title]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="overline-label">Admin</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">관리자 대시보드</h1>
      <p className="mt-2 text-sm text-slate-400">
        사용자들이 어떤 기능을 어떻게 쓰는지 봅니다. 팀 내부용 페이지입니다.
      </p>

      {/* 요약 */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      {/* 기능별 사용량 (7일) */}
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

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* 최근 활동 타임라인 */}
        <section>
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

        {/* 사용자별 현황 */}
        <section>
          <h2 className="text-lg font-bold">사용자별 현황</h2>
          <ol className="mt-3 space-y-2">
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
                      isSelf={Number(u.id) === session.userId}
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
      </div>
    </div>
  );
}
