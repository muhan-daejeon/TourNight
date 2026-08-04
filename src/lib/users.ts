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
