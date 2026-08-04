import { sql } from "./db";

export interface CommunityPost {
  id: number;
  author: string;
  body: string;
  createdAt: string; // ISO 8601
  commentCount: number;
}

export interface CommunityComment {
  id: number;
  author: string;
  body: string;
  createdAt: string; // ISO 8601
}

/** 입력 제한 — 로그인 없이 열려 있으므로 길이만 가볍게 제한 */
export const AUTHOR_MAX = 20;
export const BODY_MAX = 200;

interface PostRow {
  id: string;
  author: string;
  body: string;
  created_at: string;
  comment_count?: string;
}

interface CommentRow {
  id: string;
  author: string;
  body: string;
  created_at: string;
}

function toPost(r: PostRow): CommunityPost {
  return {
    id: Number(r.id),
    author: r.author,
    body: r.body,
    createdAt: new Date(r.created_at).toISOString(),
    commentCount: Number(r.comment_count ?? 0),
  };
}

function toComment(r: CommentRow): CommunityComment {
  return {
    id: Number(r.id),
    author: r.author,
    body: r.body,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

/**
 * 최신 글 목록 (기본 100개). DB 미설정/연결 실패 시 빈 배열로 폴백해
 * 로컬 개발·UI 테스트에서 페이지가 깨지지 않게 한다.
 */
export async function listPosts(limit = 100): Promise<CommunityPost[]> {
  try {
    const rows = await sql<PostRow[]>`
      select p.id, p.author, p.body, p.created_at,
             (select count(*) from community_comments c where c.post_id = p.id) as comment_count
      from community_posts p
      order by p.created_at desc
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

/** 작성자·본문 정규화 후 저장. 유효하지 않으면 null 반환(호출부에서 400 처리) */
export async function createPost(input: {
  author: string;
  body: string;
}): Promise<CommunityPost | null> {
  const author = input.author?.trim().slice(0, AUTHOR_MAX) ?? "";
  const body = input.body?.trim().slice(0, BODY_MAX) ?? "";
  if (!author || !body) return null;

  const rows = await sql<PostRow[]>`
    insert into community_posts (author, body)
    values (${author}, ${body})
    returning id, author, body, created_at
  `;
  return toPost(rows[0]);
}

/** 특정 글의 댓글 목록 (오래된 순). DB 실패 시 빈 배열 폴백 */
export async function listComments(postId: number): Promise<CommunityComment[]> {
  try {
    const rows = await sql<CommentRow[]>`
      select id, author, body, created_at
      from community_comments
      where post_id = ${postId}
      order by created_at asc
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
 * 댓글 저장. 입력이 유효하지 않으면 null, 대상 글이 없으면 FK 위반(23503)을
 * "not-found"로 구분해 호출부에서 404 처리한다.
 */
export async function createComment(
  postId: number,
  input: { author: string; body: string },
): Promise<CommunityComment | null | "not-found"> {
  const author = input.author?.trim().slice(0, AUTHOR_MAX) ?? "";
  const body = input.body?.trim().slice(0, BODY_MAX) ?? "";
  if (!author || !body) return null;

  try {
    const rows = await sql<CommentRow[]>`
      insert into community_comments (post_id, author, body)
      values (${postId}, ${author}, ${body})
      returning id, author, body, created_at
    `;
    return toComment(rows[0]);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "23503") {
      return "not-found"; // 없는 글에 댓글 시도 (foreign_key_violation)
    }
    throw err;
  }
}
