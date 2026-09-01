import { NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/session";
import { sql } from "@/lib/db";
import { PERSONALITY_TYPES, type PersonalityType } from "@/lib/personality-test";

interface LogDetail {
  primary: PersonalityType;
  secondary: PersonalityType | null;
  scores: Record<PersonalityType, number>;
}

function isType(v: unknown): v is PersonalityType {
  return typeof v === "string" && (PERSONALITY_TYPES as readonly string[]).includes(v);
}

/** 프로필의 "내 여행 성향 확인하기"가 읽는, 이 사용자의 가장 최근 결과 한 건 */
export async function GET() {
  const session = await getActiveSessionUser();
  if (!session) {
    return NextResponse.json({ result: null });
  }

  const rows = await sql<{ detail: LogDetail; created_at: string }[]>`
    select detail, created_at from activity_log
    where user_id = ${session.userId} and action = 'personality_test'
    order by created_at desc
    limit 1
  `;
  const row = rows[0];
  if (!row || !isType(row.detail?.primary)) {
    return NextResponse.json({ result: null });
  }

  return NextResponse.json({
    result: {
      primary: row.detail.primary,
      secondary: isType(row.detail.secondary) ? row.detail.secondary : null,
      scores: row.detail.scores,
      at: row.created_at,
    },
  });
}
