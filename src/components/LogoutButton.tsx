"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LogOut } from "lucide-react";

/**
 * 마이페이지 로그아웃 — 로그인과 마찬가지로 전체 이동(window.location.assign)을
 * 쓴다. router.push를 쓰면 로그인 상태로 프리페치돼 있던 캐시가 남아 헤더가
 * 로그아웃을 바로 반영하지 못한다 (LoginForm의 로그인 처리와 같은 이유).
 */
export default function LogoutButton() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign(`/${locale}`);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="flex items-center gap-1.5 text-sm font-semibold text-rose-500 transition hover:text-rose-600 disabled:opacity-50"
    >
      <LogOut size={14} />
      {t("logout")}
    </button>
  );
}
