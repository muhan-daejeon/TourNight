import { NextRequest, NextResponse } from "next/server";
import {
  listComments,
  createComment,
  AUTHOR_MAX,
  BODY_MAX,
} from "@/lib/community";

/** 특정 글의 댓글 목록 */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ postId: string }> },
) {
  const postId = Number((await ctx.params).postId);
  if (!Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json({ error: "invalid post id" }, { status: 400 });
  }
  const comments = await listComments(postId);
  return NextResponse.json({ comments });
}

/** 댓글 작성 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ postId: string }> },
) {
  const postId = Number((await ctx.params).postId);
  if (!Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json({ error: "invalid post id" }, { status: 400 });
  }

  let payload: { author?: unknown; body?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const author = typeof payload.author === "string" ? payload.author : "";
  const body = typeof payload.body === "string" ? payload.body : "";
  if (!author.trim() || !body.trim()) {
    return NextResponse.json(
      { error: "author and body are required" },
      { status: 400 },
    );
  }
  if (author.length > AUTHOR_MAX * 2 || body.length > BODY_MAX * 2) {
    return NextResponse.json({ error: "too long" }, { status: 400 });
  }

  try {
    const comment = await createComment(postId, { author, body });
    if (comment === "not-found") {
      return NextResponse.json({ error: "post not found" }, { status: 404 });
    }
    if (!comment) {
      return NextResponse.json({ error: "invalid input" }, { status: 400 });
    }
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    console.error(
      "[community] 댓글 저장 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "save failed" }, { status: 502 });
  }
}
