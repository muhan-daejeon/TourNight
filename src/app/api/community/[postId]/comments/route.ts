import { NextRequest, NextResponse } from "next/server";
import { listComments, createComment, BODY_MAX } from "@/lib/community";
import { getSessionUser } from "@/lib/session";
import { prepareMedia, readCommunityInput } from "@/lib/community-media";
import { deleteCommunityMedia } from "@/lib/storage";

/** 특정 글의 댓글 목록 (읽기는 로그인 불필요) */
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

/**
 * 댓글 작성 — 로그인 필요, 작성자·소유자는 세션 계정으로 강제.
 * 사진 첨부는 글과 동일하게 multipart/form-data로 받는다.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ postId: string }> },
) {
  const postId = Number((await ctx.params).postId);
  if (!Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json({ error: "invalid post id" }, { status: 400 });
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const input = await readCommunityInput(request);
  if (!input) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!input.body.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }
  if (input.body.length > BODY_MAX * 2) {
    return NextResponse.json({ error: "too long" }, { status: 400 });
  }

  const prepared = await prepareMedia(input.file);
  if (!prepared.ok) {
    return NextResponse.json({ error: prepared.error }, { status: prepared.status });
  }
  const media = prepared.media;

  try {
    const comment = await createComment(postId, {
      userId: session.userId,
      author: session.nickname,
      body: input.body,
      media,
    });
    // 저장이 무산되면 방금 올린 파일은 고아가 되므로 되돌린다
    if (comment === "not-found") {
      if (media) await deleteCommunityMedia(media.path);
      return NextResponse.json({ error: "post not found" }, { status: 404 });
    }
    if (!comment) {
      if (media) await deleteCommunityMedia(media.path);
      return NextResponse.json({ error: "invalid input" }, { status: 400 });
    }
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    if (media) await deleteCommunityMedia(media.path);
    console.error(
      "[community] 댓글 저장 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "save failed" }, { status: 502 });
  }
}
