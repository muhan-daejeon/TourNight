import { sql } from "./db";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export interface User {
  id: number;
  email: string;
  nickname: string;
  country: string | null;
  /** 'admin'은 코스 생성 한도가 없고 /admin 페이지에 들어갈 수 있다 */
  role: "user" | "admin";
  /** 메일 인증 완료 여부 — 커뮤니티 글·댓글 작성 조건 */
  emailVerified: boolean;
  /** 가입 후 둘러보기를 이미 봤는지 (건너뛰기 포함) */
  tourCompleted: boolean;
}

export const EMAIL_MAX = 254;
export const NICKNAME_MAX = 20;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 100;

/** salt:hash 형태로 저장 (scrypt, salt 16B / key 64B) */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string | null,
): Promise<boolean> {
  if (!stored) return false;
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, "hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  // 타이밍 공격 방지 — 길이 먼저 확인 후 상수시간 비교
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived);
}

interface UserRow {
  id: string;
  email: string;
  nickname: string;
  country: string | null;
  role: string;
  email_verified_at: string | null;
  tour_completed_at: string | null;
}

function toUser(r: UserRow): User {
  return {
    id: Number(r.id),
    email: r.email,
    nickname: r.nickname,
    country: r.country,
    role: r.role === "admin" ? "admin" : "user",
    emailVerified: !!r.email_verified_at,
    tourCompleted: !!r.tour_completed_at,
  };
}

/** 로그인 검증용 — password_hash 포함 (외부로 반환 금지) */
export async function findUserByEmail(email: string) {
  const rows = await sql<(UserRow & { password_hash: string | null })[]>`
    select id, email, nickname, country, role, email_verified_at, tour_completed_at, password_hash
    from users where email = ${email}
  `;
  return rows[0] ?? null;
}

export async function getUserById(id: number): Promise<User | null> {
  const rows = await sql<UserRow[]>`
    select id, email, nickname, country, role, email_verified_at, tour_completed_at from users where id = ${id}
  `;
  return rows[0] ? toUser(rows[0]) : null;
}

/**
 * 커뮤니티 쓰기 게이트 — 세션이 아니라 DB를 본다.
 * 세션 토큰에 넣어두면 다른 탭·기기에서 인증해도 재로그인 전까지 반영되지 않는다.
 */
export async function isEmailVerified(userId: number): Promise<boolean> {
  const rows = await sql<{ email_verified_at: string | null }[]>`
    select email_verified_at from users where id = ${userId}
  `;
  return !!rows[0]?.email_verified_at;
}

/** 구글 로그인처럼 제공자가 이미 주소를 확인해 준 경우 — 다시 묻지 않는다 */
export async function markVerified(userId: number): Promise<void> {
  await sql`
    update users set email_verified_at = now()
    where id = ${userId} and email_verified_at is null
  `;
}

/** 이메일 중복 시 postgres 23505(unique_violation) → 호출부에서 409 처리 */
export async function createUser(input: {
  email: string;
  password: string;
  nickname: string;
  country: string | null;
}): Promise<User> {
  const hash = await hashPassword(input.password);
  const rows = await sql<UserRow[]>`
    insert into users (email, password_hash, nickname, country)
    values (${input.email}, ${hash}, ${input.nickname}, ${input.country})
    returning id, email, nickname, country, role, email_verified_at, tour_completed_at
  `;
  return toUser(rows[0]);
}

/** 프로필(닉네임·국가) 수정. 닉네임이 비면 null 반환(호출부 400) */
export async function updateProfile(
  userId: number,
  input: { nickname: string; country: string | null },
): Promise<User | null> {
  const nickname = input.nickname?.trim().slice(0, NICKNAME_MAX) ?? "";
  if (!nickname) return null;
  const rows = await sql<UserRow[]>`
    update users
    set nickname = ${nickname}, country = ${input.country}
    where id = ${userId}
    returning id, email, nickname, country, role, email_verified_at, tour_completed_at
  `;
  return rows[0] ? toUser(rows[0]) : null;
}

/**
 * Google 로그인: oauth_id → email 순으로 기존 계정을 찾고, 없으면 새로 만든다.
 * 이메일이 같은 기존 계정이 있으면 구글을 연결(비어있을 때만)해 로그인시킨다
 * (Google이 이메일 소유를 검증하므로 email 매칭 연결은 안전).
 */
export async function findOrCreateGoogleUser(input: {
  googleId: string;
  email: string;
  name: string;
}): Promise<{ user: User; isNew: boolean }> {
  const email = input.email.trim().toLowerCase();

  const byOauth = await sql<UserRow[]>`
    select id, email, nickname, country, role, email_verified_at, tour_completed_at from users
    where oauth_provider = 'google' and oauth_id = ${input.googleId}
  `;
  if (byOauth[0]) return { user: toUser(byOauth[0]), isNew: false };

  const byEmail = await sql<UserRow[]>`
    select id, email, nickname, country, role, email_verified_at, tour_completed_at from users where email = ${email}
  `;
  if (byEmail[0]) {
    await sql`
      update users set oauth_provider = 'google', oauth_id = ${input.googleId}
      where id = ${byEmail[0].id} and oauth_provider is null
    `;
    return { user: toUser(byEmail[0]), isNew: false };
  }

  const nickname =
    (input.name || email.split("@")[0] || "user")
      .trim()
      .slice(0, NICKNAME_MAX) || "user";
  const created = await sql<UserRow[]>`
    insert into users (email, nickname, oauth_provider, oauth_id)
    values (${email}, ${nickname}, 'google', ${input.googleId})
    returning id, email, nickname, country, role, email_verified_at, tour_completed_at
  `;
  return { user: toUser(created[0]), isNew: true };
}

/**
 * 세션 세대를 올리고 새 값을 돌려준다 — 로그인할 때마다 호출한다.
 *
 * 이 값이 오르는 순간 이전 기기의 토큰은 옛 세대가 되어 무효해진다.
 * 계정 하나를 여러 사람이 나눠 쓰는 걸 막는 장치다.
 */
export async function bumpSessionVersion(userId: number): Promise<number> {
  const rows = await sql<{ session_version: number }[]>`
    update users set session_version = session_version + 1
    where id = ${userId}
    returning session_version
  `;
  return rows[0]?.session_version ?? 0;
}

/** 토큰에 실린 세대가 아직 현재 세대인지 */
export async function isSessionCurrent(
  userId: number,
  sessionVersion: number,
): Promise<boolean> {
  try {
    const rows = await sql<{ session_version: number }[]>`
      select session_version from users where id = ${userId}
    `;
    if (!rows.length) return false;
    return sessionVersion >= rows[0].session_version;
  } catch (err) {
    // DB 장애로 정상 이용자를 로그아웃시키지는 않는다 — 세션 검증의 본체는
    // JWT 서명이고, 이 대조는 그 위에 얹는 보조 장치다
    console.warn(
      "[auth] 세션 세대 확인 실패 — 통과시킵니다:",
      err instanceof Error ? err.message : err,
    );
    return true;
  }
}

/** 둘러보기를 본 것으로 기록 (완료·건너뛰기 모두). 이미 본 계정은 시각을 덮지 않는다 */
export async function completeTour(userId: number): Promise<void> {
  await sql`
    update users set tour_completed_at = now()
    where id = ${userId} and tour_completed_at is null
  `;
}
