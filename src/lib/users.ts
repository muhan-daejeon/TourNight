import { sql } from "./db";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export interface User {
  id: number;
  email: string;
  nickname: string;
  country: string | null;
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
}

function toUser(r: UserRow): User {
  return {
    id: Number(r.id),
    email: r.email,
    nickname: r.nickname,
    country: r.country,
  };
}

/** 로그인 검증용 — password_hash 포함 (외부로 반환 금지) */
export async function findUserByEmail(email: string) {
  const rows = await sql<(UserRow & { password_hash: string | null })[]>`
    select id, email, nickname, country, password_hash
    from users where email = ${email}
  `;
  return rows[0] ?? null;
}

export async function getUserById(id: number): Promise<User | null> {
  const rows = await sql<UserRow[]>`
    select id, email, nickname, country from users where id = ${id}
  `;
  return rows[0] ? toUser(rows[0]) : null;
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
    returning id, email, nickname, country
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
    returning id, email, nickname, country
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
}): Promise<User> {
  const email = input.email.trim().toLowerCase();

  const byOauth = await sql<UserRow[]>`
    select id, email, nickname, country from users
    where oauth_provider = 'google' and oauth_id = ${input.googleId}
  `;
  if (byOauth[0]) return toUser(byOauth[0]);

  const byEmail = await sql<UserRow[]>`
    select id, email, nickname, country from users where email = ${email}
  `;
  if (byEmail[0]) {
    await sql`
      update users set oauth_provider = 'google', oauth_id = ${input.googleId}
      where id = ${byEmail[0].id} and oauth_provider is null
    `;
    return toUser(byEmail[0]);
  }

  const nickname =
    (input.name || email.split("@")[0] || "user")
      .trim()
      .slice(0, NICKNAME_MAX) || "user";
  const created = await sql<UserRow[]>`
    insert into users (email, nickname, oauth_provider, oauth_id)
    values (${email}, ${nickname}, 'google', ${input.googleId})
    returning id, email, nickname, country
  `;
  return toUser(created[0]);
}
