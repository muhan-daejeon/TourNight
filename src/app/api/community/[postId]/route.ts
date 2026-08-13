import { NextRequest, NextResponse } from "next/server";
import { deletePost } from "@/lib/community";
import { getSessionUser } from "@/lib/session";
import { isAdmin } from "@/lib/activity";

/** 본인 글 삭제 */
export async function DELETE(
  _request: NextRequest,
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

  try {
    const result = await deletePost(postId, session.userId, await isAdmin(session.userId));
    if (result === "not-found") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (result === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      "[community] 글 삭제 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "delete failed" }, { status: 502 });
  }
}
