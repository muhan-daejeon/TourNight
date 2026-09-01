"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Download, X } from "lucide-react";
import { COLLAGE_BOXES, renderCollage } from "@/lib/collage";

const SLOT_LABELS = ["왼쪽 위", "오른쪽 위", "왼쪽 아래", "오른쪽 아래"];

/**
 * 헤더 카메라 아이콘 → "꿈돌이와 심야 여행" 4컷 콜라주 만들기.
 *
 * 사진은 서버로 보내지 않는다 — 전부 브라우저 안에서만 읽고 합성한다
 * (src/lib/collage.ts). 지금은 이 기능 하나뿐이라 한국어만 쓴다(다른 로케일
 * 번역 없음) — 대전 로컬 밈이라 한/영/일/중 다 옮기기보다 필요해지면 그때 넣는다.
 */
export default function CollageModal({ onClose }: { onClose: () => void }) {
  const [files, setFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [previews, setPreviews] = useState<(string | null)[]>([null, null, null, null]);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // object URL은 미리보기가 안 쓰는 순간(교체·닫기) 바로 해제한다
  useEffect(() => {
    return () => {
      previews.forEach((p) => p && URL.revokeObjectURL(p));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 언마운트 때만 한 번, previews를 매번 다시 구독하지 않는다
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pick(i: number, file: File | null) {
    setError(null);
    setPreviews((prev) => {
      if (prev[i]) URL.revokeObjectURL(prev[i]!);
      const next = [...prev];
      next[i] = file ? URL.createObjectURL(file) : null;
      return next;
    });
    setFiles((prev) => {
      const next = [...prev];
      next[i] = file;
      return next;
    });
  }

  async function download() {
    setRendering(true);
    setError(null);
    try {
      const blob = await renderCollage(files);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "꿈돌이와-심야여행.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("이미지를 만들지 못했어요. 다시 시도해 주세요.");
    } finally {
      setRendering(false);
    }
  }

  const hasAny = files.some(Boolean);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="꿈돌이와 심야 여행 콜라주 만들기"
      onClick={onClose}
      className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/90 p-4 py-10 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute -top-3 right-0 rounded-full bg-slate-800 p-2 text-slate-300 shadow-lg transition hover:text-white"
        >
          <X size={18} />
        </button>

        <h2 className="text-lg font-bold text-white">꿈돌이와 심야 여행 콜라주</h2>
        <p className="mt-1 text-sm text-slate-400">
          사진을 칸에 맞게 넣으면 대전 밤여행 콜라주로 만들어 드려요.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {COLLAGE_BOXES.map((box, i) => (
            <button
              key={i}
              type="button"
              onClick={() => inputRefs.current[i]?.click()}
              style={{ aspectRatio: `${box.w} / ${box.h}` }}
              className="group relative overflow-hidden rounded-xl border-2 border-dashed border-white/15 bg-slate-950/40 transition hover:border-amber-400/50"
            >
              {previews[i] ? (
                // eslint-disable-next-line @next/next/no-img-element -- 로컬 blob URL이라 next/image 로더가 다루지 못한다
                <img src={previews[i]!} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-slate-500 group-hover:text-slate-400">
                  <Camera size={22} />
                  <span className="text-xs font-semibold">{SLOT_LABELS[i]}</span>
                </span>
              )}
              <input
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pick(i, e.target.files?.[0] ?? null)}
              />
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={download}
          disabled={!hasAny || rendering}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={16} />
          {rendering ? "만드는 중…" : "이미지로 저장"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
