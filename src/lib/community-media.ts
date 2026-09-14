import { NextRequest } from "next/server";
import { screenImage } from "./gemini";
import {
  ALLOWED_MEDIA,
  MEDIA_MAX_BYTES,
  isStorageConfigured,
  uploadCommunityMedia,
  type MediaKind,
} from "./storage";

/**
 * 커뮤니티 글·댓글의 본문/첨부 처리 — 두 라우트가 완전히 같은 규칙을 쓰므로 여기 모은다.
 * 첨부가 있으면 multipart/form-data, 없으면 기존 JSON 본문 둘 다 받는다.
 */

export interface CommunityInput {
  body: string;
  file: File | null;
  /** 방문 명소 태그(content_id들) — 글 작성에서만 쓰고 댓글은 무시한다 */
  contentIds: string[];
}

/** JSON 문자열/배열 어느 쪽으로 와도 문자열 배열로 — 형식이 깨졌으면 빈 배열 */
function parseContentIds(raw: unknown): string[] {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** 요청에서 본문과 첨부를 꺼낸다. 형식이 깨졌으면 null */
export async function readCommunityInput(
  request: NextRequest,
): Promise<CommunityInput | null> {
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return null;
    }
    const attached = form.get("media");
    return {
      body: typeof form.get("body") === "string" ? String(form.get("body")) : "",
      file: attached instanceof File && attached.size > 0 ? attached : null,
      contentIds: parseContentIds(form.get("contentIds")),
    };
  }

  try {
    const payload: { body?: unknown; contentIds?: unknown } = await request.json();
    return {
      body: typeof payload.body === "string" ? payload.body : "",
      file: null,
      contentIds: parseContentIds(payload.contentIds),
    };
  } catch {
    return null;
  }
}

export type MediaResult =
  | { ok: true; media: { path: string; kind: MediaKind } | null }
  | { ok: false; error: string; status: number };

/**
 * 첨부 검증 → 자동 심사 → 업로드.
 * 심사 호출 자체가 실패하면 통과시킨다 — Gemini 장애로 글쓰기 전체가 막히면 안 된다.
 */
export async function prepareMedia(file: File | null): Promise<MediaResult> {
  if (!file) return { ok: true, media: null };

  if (!isStorageConfigured()) {
    return { ok: false, error: "attach_unavailable", status: 503 };
  }
  const spec = ALLOWED_MEDIA[file.type];
  if (!spec) return { ok: false, error: "unsupported_type", status: 415 };
  if (file.size > spec.maxBytes || file.size > MEDIA_MAX_BYTES) {
    return { ok: false, error: "file_too_large", status: 413 };
  }

  const bytes = await file.arrayBuffer();

  try {
    const verdict = await screenImage(bytes, file.type);
    if (!verdict.allowed) {
      console.warn(`[community] 첨부 거절: ${verdict.reason}`);
      return { ok: false, error: "media_rejected", status: 422 };
    }
  } catch (err) {
    console.warn(
      "[community] 첨부 심사 실패 — 통과 처리:",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    return { ok: true, media: await uploadCommunityMedia(bytes, file.type) };
  } catch (err) {
    console.error(
      "[community] 첨부 업로드 실패:",
      err instanceof Error ? err.message : err,
    );
    return { ok: false, error: "upload failed", status: 502 };
  }
}
