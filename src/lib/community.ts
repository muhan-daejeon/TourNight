import { sql } from "./db";
import {
  deleteCommunityMedia,
  mediaPublicUrl,
  type MediaKind,
} from "./storage";

export interface CommunityPost {
  id: number;
  userId: number | null; // 작성 계정 (기존/시드 글은 null)
  author: string;
  body: string;
  createdAt: string; // ISO 8601
  commentCount: number;
  /** 첨부 공개 URL (없으면 null) */
  mediaUrl: string | null;
  mediaType: MediaKind | null;
  /** 작성자가 메일 인증을 마쳤는지 — 목록에 배지로 표시한다 */
  authorVerified: boolean;
}

export interface CommunityComment {
  id: number;
  userId: number | null;
  author: string;
  body: string;
  createdAt: string; // ISO 8601
  /** 첨부 공개 URL (없으면 null) */
  mediaUrl: string | null;
  mediaType: MediaKind | null;
  /** 작성자가 메일 인증을 마쳤는지 */
  authorVerified: boolean;
  /** 보는 사람 언어로의 번역 (원문과 같거나 번역 실패면 없음) */
  translatedBody?: string;
}

/** 입력 제한 */
export const AUTHOR_MAX = 20;
export const BODY_MAX = 200;

interface PostRow {
  id: string;
  user_id: string | null;
  author: string;
  body: string;
  created_at: string;
  comment_count?: string;
  media_path?: string | null;
  media_type?: string | null;
  author_verified?: boolean;
}

interface CommentRow {
  id: string;
  user_id: string | null;
  author: string;
  body: string;
  created_at: string;
  media_path?: string | null;
  media_type?: string | null;
  author_verified?: boolean;
}

function toPost(r: PostRow): CommunityPost {
  return {
    id: Number(r.id),
    userId: r.user_id != null ? Number(r.user_id) : null,
    author: r.author,
    body: r.body,
    createdAt: new Date(r.created_at).toISOString(),
    commentCount: Number(r.comment_count ?? 0),
    mediaUrl: r.media_path ? mediaPublicUrl(r.media_path) : null,
    mediaType: (r.media_type as MediaKind | null) ?? null,
    authorVerified: !!r.author_verified,
  };
}

function toComment(r: CommentRow): CommunityComment {
  return {
    id: Number(r.id),
    userId: r.user_id != null ? Number(r.user_id) : null,
    author: r.author,
    body: r.body,
    createdAt: new Date(r.created_at).toISOString(),
    mediaUrl: r.media_path ? mediaPublicUrl(r.media_path) : null,
    mediaType: (r.media_type as MediaKind | null) ?? null,
    authorVerified: !!r.author_verified,
  };
}

/**
 * 최신 글 목록 (기본 100개). DB 미설정/연결 실패 시 빈 배열로 폴백.
 */
export async function listPosts(limit = 100): Promise<CommunityPost[]> {
  try {
    const rows = await sql<PostRow[]>`
      select p.id, p.user_id, p.author, p.body, p.created_at,
             p.media_path, p.media_type,
             bool_or(u.email_verified_at is not null) as author_verified,
             count(c.id) as comment_count
      from community_posts p
      left join community_comments c on c.post_id = p.id
      left join users u on u.id = p.user_id
      group by p.id
      -- 시드 글처럼 created_at이 같은 행이 있어 id를 부기준으로 둔다.
      -- 없으면 쿼리 계획에 따라 순서가 뒤바뀌어 목록이 매번 달라 보인다.
      order by p.created_at desc, p.id desc
      limit ${limit}
    `;
    return rows.map(toPost);
  } catch (err) {
    console.warn(
      "[community] DB 조회 실패 — 빈 목록으로 폴백합니다:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

/**
 * 이번 주 인기글 — 홈 미리보기용.
 *
 * 조회수를 따로 세지 않으므로 댓글 수를 인기 기준으로 쓴다. 최근 7일 글만 보되,
 * 활동이 적은 주에는 목록이 비어 홈이 휑해지므로 모자라면 최신 글로 채운다.
 */
export async function listPopularPosts(limit = 4): Promise<CommunityPost[]> {
  try {
    const rows = await sql<PostRow[]>`
      select p.id, p.user_id, p.author, p.body, p.created_at,
             p.media_path, p.media_type,
             bool_or(u.email_verified_at is not null) as author_verified,
             count(c.id) as comment_count
      from community_posts p
      left join community_comments c on c.post_id = p.id
      left join users u on u.id = p.user_id
      group by p.id
      -- 이번 주 글을 먼저(댓글 많은 순), 그다음 최신 순으로 자리를 메운다
      order by (p.created_at >= now() - interval '7 days') desc,
               count(c.id) desc,
               p.created_at desc,
               p.id desc
      limit ${limit}
    `;
    return rows.map(toPost);
  } catch (err) {
    console.warn(
      "[community] 인기글 조회 실패 — 빈 목록으로 폴백합니다:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

/** 작성자·본문 정규화 후 저장. 유효하지 않으면 null */
export async function createPost(input: {
  userId: number;
  author: string;
  body: string;
  media?: { path: string; kind: MediaKind } | null;
  /** 관문에서 이미 확인한 값 — 방금 쓴 글에도 배지가 바로 붙게 한다 */
  verified: boolean;
}): Promise<CommunityPost | null> {
  const author = input.author?.trim().slice(0, AUTHOR_MAX) ?? "";
  const body = input.body?.trim().slice(0, BODY_MAX) ?? "";
  if (!author || !body) return null;

  const rows = await sql<PostRow[]>`
    insert into community_posts (user_id, author, body, media_path, media_type)
    values (${input.userId}, ${author}, ${body},
            ${input.media?.path ?? null}, ${input.media?.kind ?? null})
    returning id, user_id, author, body, created_at, media_path, media_type
  `;
  return toPost({ ...rows[0], author_verified: input.verified });
}

/** 특정 글의 댓글 목록 (오래된 순). DB 실패 시 빈 배열 폴백 */
export async function listComments(postId: number): Promise<CommunityComment[]> {
  try {
    const rows = await sql<CommentRow[]>`
      select c.id, c.user_id, c.author, c.body, c.created_at,
             c.media_path, c.media_type,
             (u.email_verified_at is not null) as author_verified
      from community_comments c
      left join users u on u.id = c.user_id
      where c.post_id = ${postId}
      order by c.created_at asc, c.id asc
    `;
    return rows.map(toComment);
  } catch (err) {
    console.warn(
      "[community] 댓글 조회 실패 — 빈 목록으로 폴백합니다:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

/**
 * 댓글 목록 + 보는 사람 언어로의 자동 번역.
 *
 * 언어가 다른 여행자들이 한 게시판에서 소통해야 하므로, 댓글을 보는 사람의
 * 언어로 옮겨 함께 내려준다. 번역은 community_comment_translations에 캐시돼
 * 같은 댓글·같은 언어는 Gemini를 한 번만 거친다. 번역이 원문과 같으면(이미
 * 그 언어) translatedBody를 붙이지 않고, Gemini 실패 시에도 원문만 내려간다 —
 * 번역은 부가 정보라 목록 조회를 막지 않는다.
 */
export async function listCommentsTranslated(
  postId: number,
  locale: string,
): Promise<CommunityComment[]> {
  const comments = await listComments(postId);
  if (comments.length === 0) return comments;

  try {
    const ids = comments.map((c) => c.id);
    const cached = await sql<{ comment_id: number; body: string }[]>`
      select comment_id, body from community_comment_translations
      where locale = ${locale} and comment_id = any(${ids})
    `;
    const byId = new Map(cached.map((r) => [Number(r.comment_id), r.body]));

    const missing = comments.filter((c) => !byId.has(c.id));
    if (missing.length > 0) {
      const { translateCommunityTexts } = await import("./gemini");
      const fresh = await translateCommunityTexts(
        missing.map((c) => ({ id: c.id, body: c.body })),
        locale,
      );
      for (const [idStr, body] of Object.entries(fresh)) {
        const id = Number(idStr);
        byId.set(id, body);
        // 캐시 저장 실패는 무시 — 다음 조회 때 다시 번역하면 된다
        void sql`
          insert into community_comment_translations (comment_id, locale, body)
          values (${id}, ${locale}, ${body})
          on conflict (comment_id, locale) do nothing
        `.catch(() => {});
      }
    }

    return comments.map((c) => {
      const tr = byId.get(c.id);
      // 원문과 같으면(이미 그 언어로 쓰인 댓글) 번역 표시가 소음이라 붙이지 않는다
      return tr && tr !== c.body ? { ...c, translatedBody: tr } : c;
    });
  } catch (err) {
    console.warn(
      "[community] 댓글 번역 실패 — 원문만 내려갑니다:",
      err instanceof Error ? err.message : err,
    );
    return comments;
  }
}

/**
 * 댓글 저장. 대상 글이 없으면 FK 위반(23503)을 "not-found"로 구분.
 */
export async function createComment(
  postId: number,
  input: {
    userId: number;
    author: string;
    body: string;
    media?: { path: string; kind: MediaKind } | null;
    verified: boolean;
  },
): Promise<CommunityComment | null | "not-found"> {
  const author = input.author?.trim().slice(0, AUTHOR_MAX) ?? "";
  const body = input.body?.trim().slice(0, BODY_MAX) ?? "";
  if (!author || !body) return null;

  try {
    const rows = await sql<CommentRow[]>`
      insert into community_comments (post_id, user_id, author, body, media_path, media_type)
      values (${postId}, ${input.userId}, ${author}, ${body},
              ${input.media?.path ?? null}, ${input.media?.kind ?? null})
      returning id, user_id, author, body, created_at, media_path, media_type
    `;
    return toComment({ ...rows[0], author_verified: input.verified });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "23503") {
      return "not-found";
    }
    throw err;
  }
}

type DeleteResult = "ok" | "not-found" | "forbidden";

/**
 * 본인(userId 일치) 글만 삭제. 댓글은 FK cascade로 함께 삭제.
 * 첨부 파일도 같이 지운다 — public 버킷이라 남기면 글을 내린 뒤에도 URL로 열람된다.
 */
export async function deletePost(
  postId: number,
  userId: number,
  /** 관리자 삭제 — 소유자 확인을 건너뛴다 (관리자 페이지의 부적절 글 정리) */
  asAdmin = false,
): Promise<DeleteResult> {
  const rows = await sql<{ user_id: string | null; media_path: string | null }[]>`
    select user_id, media_path from community_posts where id = ${postId}
  `;
  if (!rows.length) return "not-found";
  if (!asAdmin && (rows[0].user_id == null || Number(rows[0].user_id) !== userId)) {
    return "forbidden";
  }
  await sql`delete from community_posts where id = ${postId}`;
  if (rows[0].media_path) await deleteCommunityMedia(rows[0].media_path);
  return "ok";
}

/** 본인 댓글만 삭제. 첨부도 함께 지운다 (public 버킷이라 남기면 계속 열람된다) */
export async function deleteComment(
  commentId: number,
  userId: number,
  /** 관리자 삭제 — 소유자 확인을 건너뛴다 */
  asAdmin = false,
): Promise<DeleteResult> {
  const rows = await sql<{ user_id: string | null; media_path: string | null }[]>`
    select user_id, media_path from community_comments where id = ${commentId}
  `;
  if (!rows.length) return "not-found";
  if (!asAdmin && (rows[0].user_id == null || Number(rows[0].user_id) !== userId)) {
    return "forbidden";
  }
  await sql`delete from community_comments where id = ${commentId}`;
  if (rows[0].media_path) await deleteCommunityMedia(rows[0].media_path);
  return "ok";
}

export type ReportTarget = "post" | "comment";

/** 신고 사유 — 자유 입력은 받지 않는다 (개인정보·욕설이 그대로 들어올 수 있다) */
export const REPORT_REASONS = [
  "spam",
  "abuse",
  "sexual",
  "privacy",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportResult = "ok" | "duplicate" | "not-found";

/**
 * 신고 접수. 같은 사람이 같은 대상을 다시 누르면 duplicate.
 * 대상이 실제로 있는지 먼저 확인해 없는 id로 표가 더러워지는 걸 막는다.
 */
export async function reportContent(input: {
  targetType: ReportTarget;
  targetId: number;
  reporterId: number;
  reason: ReportReason;
}): Promise<ReportResult> {
  const exists =
    input.targetType === "post"
      ? await sql<{ id: string }[]>`select id from community_posts where id = ${input.targetId}`
      : await sql<{ id: string }[]>`select id from community_comments where id = ${input.targetId}`;
  if (!exists.length) return "not-found";

  try {
    await sql`
      insert into community_reports (target_type, target_id, reporter_id, reason)
      values (${input.targetType}, ${input.targetId}, ${input.reporterId}, ${input.reason})
    `;
    return "ok";
  } catch (err) {
    // 23505 = unique_violation → 이미 신고한 대상
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return "duplicate";
    }
    throw err;
  }
}

export interface ReportedItem {
  targetType: ReportTarget;
  targetId: number;
  reportCount: number;
  lastReportedAt: string;
  reasons: string[];
  /** 원본이 이미 지워졌으면 null */
  body: string | null;
  author: string | null;
}

/** 관리자용 — 신고가 많은 순으로 (원본이 지워진 것도 이력으로 남겨 보여준다) */
export async function listReports(limit = 50): Promise<ReportedItem[]> {
  try {
    const rows = await sql<
      {
        target_type: string;
        target_id: string;
        report_count: string;
        last_reported_at: string;
        reasons: string[];
        body: string | null;
        author: string | null;
      }[]
    >`
      select r.target_type, r.target_id,
             count(*) as report_count,
             max(r.created_at) as last_reported_at,
             array_agg(distinct r.reason) as reasons,
             coalesce(p.body, c.body) as body,
             coalesce(p.author, c.author) as author
      from community_reports r
      left join community_posts p
        on r.target_type = 'post' and p.id = r.target_id
      left join community_comments c
        on r.target_type = 'comment' and c.id = r.target_id
      group by r.target_type, r.target_id, p.body, c.body, p.author, c.author
      order by count(*) desc, max(r.created_at) desc
      limit ${limit}
    `;
    return rows.map((r) => ({
      targetType: r.target_type as ReportTarget,
      targetId: Number(r.target_id),
      reportCount: Number(r.report_count),
      lastReportedAt: new Date(r.last_reported_at).toISOString(),
      reasons: r.reasons ?? [],
      body: r.body,
      author: r.author,
    }));
  } catch (err) {
    console.warn(
      "[community] 신고 목록 조회 실패:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}
