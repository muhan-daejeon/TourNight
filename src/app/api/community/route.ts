import { NextRequest, NextResponse } from "next/server";
import { listPosts, createPost, AUTHOR_MAX, BODY_MAX } from "@/lib/community";

/** 최신 커뮤니티 글 목록 */
export async function GET() {
  const posts = await listPosts();
  return NextResponse.json({ posts });
}

/** 한줄 후기/질문 작성 — 로그인 없이 이름만 받는다 */
export async function POST(request: NextRequest) {
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
    // 서버에서도 과도한 페이로드는 거부 (정규화는 createPost가 slice로 처리)
    return NextResponse.json({ error: "too long" }, { status: 400 });
  }

  try {
    const post = await createPost({ author, body });
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
