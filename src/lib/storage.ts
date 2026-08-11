/**
 * Supabase Storage (커뮤니티 첨부) — REST API 직접 호출
 *
 * @supabase/supabase-js를 쓰지 않는다. 업로드/삭제/공개URL 세 가지뿐이라 fetch로 충분하고,
 * 의존성을 늘리면 package-lock이 흔들려 CI(npm ci)가 깨진 전례가 있다.
 *
 * service_role 키는 RLS를 전부 우회하므로 서버에서만 쓴다 (NEXT_PUBLIC_ 금지).
 * 버킷은 public read라 조회는 인증 없이 되지만, 쓰기는 이 모듈을 통해서만 이뤄진다.
 */

const BUCKET = "community";

/**
 * 허용 첨부 형식. 영상은 무료 한도(저장 1GB·전송량) 때문에 지금은 닫아두었다.
 * 열 때는 아래 두 상수와 Supabase 버킷 설정(File size limit, Allowed MIME types)을 함께 바꾼다.
 *   video/mp4: { maxBytes: 20 * 1024 * 1024, kind: "video" }
 */
export const ALLOWED_MEDIA: Record<
  string,
  { maxBytes: number; kind: "image" | "video"; ext: string }
> = {
  "image/webp": { maxBytes: 5 * 1024 * 1024, kind: "image", ext: "webp" },
  "image/jpeg": { maxBytes: 5 * 1024 * 1024, kind: "image", ext: "jpg" },
  "image/png": { maxBytes: 5 * 1024 * 1024, kind: "image", ext: "png" },
};

/** 어떤 형식이든 이 크기를 넘으면 즉시 거절 (요청 본문 방어) */
export const MEDIA_MAX_BYTES = Math.max(
  ...Object.values(ALLOWED_MEDIA).map((m) => m.maxBytes),
);

export type MediaKind = "image" | "video";

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다",
    );
  }
  return { url: url.replace(/\/$/, ""), key };
}

/** 첨부 기능을 쓸 수 있는 환경인지 (키 없으면 UI에서 첨부를 숨긴다) */
export function isStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** 저장 경로 → 공개 URL. 경로만 DB에 두고 URL은 조회 시 만든다 */
export function mediaPublicUrl(path: string): string {
  const { url } = config();
  return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
}

/**
 * 커뮤니티 첨부 업로드. 파일명은 UUID라 URL 추측·나열이 불가능하다
 * (public 버킷이므로 경로가 곧 접근 권한이다).
 */
export async function uploadCommunityMedia(
  bytes: ArrayBuffer,
  mimeType: string,
): Promise<{ path: string; kind: MediaKind }> {
  const spec = ALLOWED_MEDIA[mimeType];
  if (!spec) throw new Error(`허용되지 않는 형식: ${mimeType}`);
  if (bytes.byteLength > spec.maxBytes) {
    throw new Error(`파일이 너무 큽니다: ${bytes.byteLength}바이트`);
  }

  const { url, key } = config();
  const path = `posts/${crypto.randomUUID()}.${spec.ext}`;
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": mimeType,
      // 캐시를 길게 잡으면 안 된다. 무료 플랜에는 CDN 자동 무효화가 없어서,
      // 글을 지워 객체를 삭제해도 그 시간만큼 CDN 캐시본이 공개 URL로 계속 서빙된다.
      // (immutable + 1년으로 뒀다가 삭제 후에도 사진이 열리는 걸 확인하고 되돌렸다)
      // 5분이면 삭제 지연이 짧고, 피드를 여러 명이 동시에 볼 때의 원본 요청도 흡수한다.
      "cache-control": "public, max-age=300",
    },
    body: bytes,
  });
  if (!res.ok) {
    throw new Error(`업로드 실패 ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return { path, kind: spec.kind };
}

/**
 * 첨부 삭제. 글이 지워지면 파일도 반드시 지운다 — public 버킷이라
 * 남겨두면 글을 내린 뒤에도 URL로 계속 열람된다 (용량이 아니라 프라이버시 문제).
 * 실패해도 예외를 던지지 않고 경고만 남긴다 (글 삭제 자체는 성공시켜야 하므로).
 */
export async function deleteCommunityMedia(path: string): Promise<void> {
  try {
    const { url, key } = config();
    const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      console.warn(`[storage] 첨부 삭제 실패 ${res.status}: ${path}`);
    }
  } catch (err) {
    console.warn(
      "[storage] 첨부 삭제 중 오류:",
      err instanceof Error ? err.message : err,
    );
  }
}
