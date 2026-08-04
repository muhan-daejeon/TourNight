import { NextRequest, NextResponse } from "next/server";
import { listPosts, createPost, BODY_MAX } from "@/lib/community";
import { getSessionUser } from "@/lib/session";

/** 최신 커뮤니티 글 목록 (읽기는 로그인 불필요) */
export async function GET() {
  const posts = await listPosts();
  return NextResponse.json({ posts });
}

/** 한줄 후기/질문 작성 — 로그인 필요, 작성자·소유자는 세션 계정으로 강제 */
export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  let payload: { body?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const body = typeof payload.body === "string" ? payload.body : "";
  if (!body.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }
  if (body.length > BODY_MAX * 2) {
    return NextResponse.json({ error: "too long" }, { status: 400 });
  }

  try {
    const post = await createPost({
      userId: session.userId,
      author: session.nickname,
      body,
    });
    if (!post) {
      return NextResponse.json({ error: "invalid input" }, { status: 400 });
    }
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error(
      "[community] 글 저장 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "save failed" }, { status: 502 });
  }
}
