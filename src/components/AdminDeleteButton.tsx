"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

/** 관리자 대시보드의 글·댓글 삭제 버튼 (한국어 고정) */
export default function AdminDeleteButton({
  url,
  label,
}: {
  /** DELETE를 보낼 주소 (/api/community/1 또는 /api/community/1/comments/2) */
  url: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`${label}을(를) 삭제할까요? 되돌릴 수 없어요.`)) return;
    setBusy(true);
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      window.alert("삭제에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      aria-label={`${label} 삭제`}
      className="shrink-0 rounded-full p-1.5 text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-50"
    >
      <Trash2 size={14} />
    </button>
  );
}
