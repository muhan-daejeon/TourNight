import { NextRequest, NextResponse } from "next/server";
import { listPosts, createPost, BODY_MAX } from "@/lib/community";
import { getSessionUser } from "@/lib/session";
import { screenImage } from "@/lib/gemini";
import {
  ALLOWED_MEDIA,
  MEDIA_MAX_BYTES,
  deleteCommunityMedia,
  isStorageConfigured,
  uploadCommunityMedia,
  type MediaKind,
} from "@/lib/storage";

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
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  let body = "";
  let file: File | null = null;

  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "invalid form" }, { status: 400 });
    }
    body = typeof form.get("body") === "string" ? String(form.get("body")) : "";
    const attached = form.get("media");
    if (attached instanceof File && attached.size > 0) file = attached;
  } else {
    let payload: { body?: unknown };
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }
    body = typeof payload.body === "string" ? payload.body : "";
  }

  if (!body.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }
  if (body.length > BODY_MAX * 2) {
    return NextResponse.json({ error: "too long" }, { status: 400 });
  }

  // 첨부 검증 → 심사 → 업로드
  let media: { path: string; kind: MediaKind } | null = null;
  if (file) {
    if (!isStorageConfigured()) {
      return NextResponse.json({ error: "attach_unavailable" }, { status: 503 });
    }
    const spec = ALLOWED_MEDIA[file.type];
    if (!spec) {
      return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
    }
    if (file.size > spec.maxBytes || file.size > MEDIA_MAX_BYTES) {
      return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();

    // 부적절 이미지 자동 심사. 심사 자체가 실패하면 통과시킨다 —
    // Gemini 장애로 글쓰기 전체가 막히는 편이 더 나쁘다.
    try {
      const verdict = await screenImage(bytes, file.type);
      if (!verdict.allowed) {
        console.warn(`[community] 첨부 거절: ${verdict.reason}`);
        return NextResponse.json({ error: "media_rejected" }, { status: 422 });
      }
    } catch (err) {
      console.warn(
        "[community] 첨부 심사 실패 — 통과 처리:",
        err instanceof Error ? err.message : err,
      );
    }

    try {
      media = await uploadCommunityMedia(bytes, file.type);
    } catch (err) {
      console.error(
        "[community] 첨부 업로드 실패:",
        err instanceof Error ? err.message : err,
      );
      return NextResponse.json({ error: "upload failed" }, { status: 502 });
    }
  }

  try {
    const post = await createPost({
      userId: session.userId,
      author: session.nickname,
      body,
      media,
    });
    if (!post) {
      // 글 저장이 무산되면 방금 올린 파일은 고아가 되므로 되돌린다
      if (media) await deleteCommunityMedia(media.path);
      return NextResponse.json({ error: "invalid input" }, { status: 400 });
    }
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
