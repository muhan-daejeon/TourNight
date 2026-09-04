import { NextRequest, NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/session";
import { setStampPhoto } from "@/lib/stamp-tour";
import { screenImage } from "@/lib/gemini";
import {
  ALLOWED_MEDIA,
  MEDIA_MAX_BYTES,
  isStorageConfigured,
  uploadStampPhoto,
} from "@/lib/storage";
import { logActivity } from "@/lib/activity";

/**
 * 도장 인증사진 업로드 — GPS로 그 장소에 있는지는 브라우저에서 이미 확인한
 * 뒤에만 이 엔드포인트를 부른다(navigator.geolocation은 서버에서 다시 잴 수
 * 없다). 여기서는 로그인·소유·형식만 지킨다.
 */
export async function POST(request: NextRequest) {
  const session = await getActiveSessionUser();
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "attach_unavailable" }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const slot = Number(form.get("slot"));
  const file = form.get("photo");
  if (!Number.isInteger(slot) || slot < 0 || slot > 3) {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "photo is required" }, { status: 400 });
  }

  const spec = ALLOWED_MEDIA[file.type];
  if (!spec || spec.kind !== "image") {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }
  if (file.size > spec.maxBytes || file.size > MEDIA_MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const bytes = await file.arrayBuffer();

  // 커뮤니티 첨부와 같은 자동 심사 기준을 쓴다 — 실패하면 통과(가용성 우선)
  try {
    const verdict = await screenImage(bytes, file.type);
    if (!verdict.allowed) {
      return NextResponse.json({ error: "photo_rejected" }, { status: 422 });
    }
  } catch (err) {
    console.warn(
      "[stamp-tour] 사진 심사 실패 — 통과 처리:",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    const { path } = await uploadStampPhoto(bytes, file.type);
    const result = await setStampPhoto(session.userId, slot, path);
    if (!result.ok) {
      const status = result.error === "not-found" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    logActivity(session.userId, "stamp_tour_photo", { slot });
    return NextResponse.json({ tour: result.tour });
  } catch (err) {
    console.error(
      "[stamp-tour] 사진 저장 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "save failed" }, { status: 502 });
  }
}
