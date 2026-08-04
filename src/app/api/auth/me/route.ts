import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getUserById } from "@/lib/users";

/** 현재 로그인 사용자 (없으면 user: null). 국가·닉네임은 DB 최신값으로 반환 */
export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  try {
    const user = await getUserById(session.userId);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
