"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 관리자 지정/해제 버튼 (관리자 대시보드 전용 — 한국어 고정).
 * 자기 자신 해제는 서버가 막지만, 버튼도 숨겨 실수를 줄인다.
 */
export default function AdminRoleToggle({
  userId,
  role,
  isSelf,
}: {
  userId: number;
  role: "user" | "admin";
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = role === "admin" ? "user" : "admin";

  if (isSelf) return null;

  async function toggle() {
    const label = next === "admin" ? "관리자로 지정" : "관리자 해제";
    if (!window.confirm(`이 계정을 ${label}할까요?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh(); // 서버 컴포넌트 목록 다시 그리기
    } catch {
      window.alert("변경에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition disabled:opacity-50 ${
        role === "admin"
          ? "border-white/15 text-slate-400 hover:border-rose-300/50 hover:text-rose-300"
          : "border-white/15 text-slate-400 hover:border-amber-300/60 hover:text-amber-300"
      }`}
    >
      {busy ? "..." : role === "admin" ? "관리자 해제" : "관리자 지정"}
    </button>
  );
}
