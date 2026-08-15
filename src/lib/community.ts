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
}

interface CommentRow {
  id: string;
  user_id: string | null;
  author: string;
  body: string;
  created_at: string;
  media_path?: string | null;
  media_type?: string | null;
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
             count(c.id) as comment_count
      from community_posts p
      left join community_comments c on c.post_id = p.id
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
             count(c.id) as comment_count
      from community_posts p
      left join community_comments c on c.post_id = p.id
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
  return toPost(rows[0]);
}

/** 특정 글의 댓글 목록 (오래된 순). DB 실패 시 빈 배열 폴백 */
export async function listComments(postId: number): Promise<CommunityComment[]> {
  try {
    const rows = await sql<CommentRow[]>`
      select id, user_id, author, body, created_at, media_path, media_type
      from community_comments
      where post_id = ${postId}
      order by created_at asc, id asc
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
 * 댓글 저장. 대상 글이 없으면 FK 위반(23503)을 "not-found"로 구분.
 */
export async function createComment(
  postId: number,
  input: {
    userId: number;
    author: string;
    body: string;
    media?: { path: string; kind: MediaKind } | null;
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
    return toComment(rows[0]);
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
