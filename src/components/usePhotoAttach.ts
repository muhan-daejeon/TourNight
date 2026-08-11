"use client";

import { useEffect, useRef, useState } from "react";
import { ImageDecodeError, prepareImage } from "@/lib/image-resize";

/** 서버 검증과 같은 상한 (storage.ts ALLOWED_MEDIA) */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * 사진 첨부 선택·미리보기 상태. 글 작성과 댓글 작성이 동일하게 쓴다.
 * 업로드 전 클라이언트에서 리사이즈해 폰 사진 원본(4~8MB)을 그대로 올리지 않는다.
 */
export function usePhotoAttach(t: {
  tooLarge: string;
  unsupported: string;
  generic: string;
}) {
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 미리보기 objectURL 누수 방지
  useEffect(() => {
    const url = photo?.preview;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo?.preview]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일을 다시 고를 수 있게
    if (!file) return;
    try {
      const prepared = await prepareImage(file);
      if (prepared.size > MAX_BYTES) {
        alert(t.tooLarge);
        return;
      }
      setPhoto({ file: prepared, preview: URL.createObjectURL(prepared) });
    } catch (err) {
      alert(err instanceof ImageDecodeError ? t.unsupported : t.generic);
    }
  }

  /** 사진이 있으면 multipart, 없으면 JSON — fetch 옵션을 만들어 준다 */
  function requestInit(body: string): RequestInit {
    if (!photo) {
      return {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      };
    }
    const form = new FormData();
    form.set("body", body);
    form.set("media", photo.file);
    return { method: "POST", body: form };
  }

  return { photo, clear: () => setPhoto(null), pick, inputRef, requestInit };
}

/** 업로드 실패 응답을 사용자 문구로 (글·댓글 공통) */
export function photoErrorMessage(
  status: number,
  t: { rejected: string; tooLarge: string; unsupported: string },
): string | null {
  if (status === 422) return t.rejected;
  if (status === 413) return t.tooLarge;
  if (status === 415) return t.unsupported;
  return null;
}
