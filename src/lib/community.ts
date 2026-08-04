import { sql } from "./db";

export interface CommunityPost {
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
}

function toPost(r: PostRow): CommunityPost {
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
      select id, author, body, created_at
      from community_posts
      order by created_at desc
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
