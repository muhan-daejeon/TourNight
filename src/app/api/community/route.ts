import { NextRequest, NextResponse } from "next/server";
import { listPosts, createPost, BODY_MAX } from "@/lib/community";
import { getActiveSessionUser } from "@/lib/session";
import { guardCommunityWrite } from "@/lib/community-guard";
import { prepareMedia, readCommunityInput } from "@/lib/community-media";
import { deleteCommunityMedia, isStorageConfigured } from "@/lib/storage";
import { logActivity } from "@/lib/activity";

/** 최신 커뮤니티 글 목록 (읽기는 로그인 불필요) */
export async function GET() {
  const posts = await listPosts();
  return NextResponse.json({ posts, canAttach: isStorageConfigured() });
}

/**
 * 한줄 후기/질문 작성 — 로그인 필요, 작성자·소유자는 세션 계정으로 강제.
 * 사진 첨부는 multipart/form-data로 받는다 (JSON 본문도 계속 지원).
 */
export async function POST(request: NextRequest) {
  const session = await getActiveSessionUser();
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

  // 일일 한도 + 본문 검수. 사진 검수(prepareMedia)보다 먼저 봐서, 한도를 넘긴
  // 요청으로 사진 업로드·Gemini 이미지 호출까지 가지 않게 한다
  const guard = await guardCommunityWrite(session.userId, "post", input.body);
  if (!guard.ok) return guard.response;

  const prepared = await prepareMedia(input.file);
  if (!prepared.ok) {
    return NextResponse.json({ error: prepared.error }, { status: prepared.status });
  }
  const media = prepared.media;

  try {
    const post = await createPost({
      userId: session.userId,
      author: session.nickname,
      body: input.body,
      media,
      verified: guard.verified,
    });
    if (!post) {
      // 글 저장이 무산되면 방금 올린 파일은 고아가 되므로 되돌린다
      if (media) await deleteCommunityMedia(media.path);
      return NextResponse.json({ error: "invalid input" }, { status: 400 });
    }
    logActivity(session.userId, "community_post", {
      postId: post.id,
      hasPhoto: Boolean(media),
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    if (media) await deleteCommunityMedia(media.path);
    console.error(
      "[community] 글 저장 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "save failed" }, { status: 502 });
  }
}
