import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getActiveSessionUser } from "@/lib/session";
import { isAdmin } from "@/lib/activity";

/** 관리자 지정/해제 — 관리자만 호출할 수 있고, 자기 자신은 해제할 수 없다 */
export async function POST(request: NextRequest) {
  const session = await getActiveSessionUser();
  if (!session || !(await isAdmin(session.userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let payload: { userId?: unknown; role?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const userId = Number(payload.userId);
  const role = payload.role;
  if (!Number.isInteger(userId) || (role !== "user" && role !== "admin")) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }
  // 마지막 관리자가 자신을 해제하면 아무도 관리자 페이지에 못 들어간다
  if (userId === session.userId && role === "user") {
    return NextResponse.json({ error: "cannot_demote_self" }, { status: 400 });
  }

  const rows = await sql<{ id: string }[]>`
    update users set role = ${role} where id = ${userId} returning id
  `;
  if (!rows.length) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
