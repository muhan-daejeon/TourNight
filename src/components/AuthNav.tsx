"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

interface Me {
  nickname: string;
  role?: "user" | "admin";
}

export default function AuthNav() {
  const t = useTranslations("auth");
  const pathname = usePathname();
  // undefined = 로딩(아직 모름), null = 비로그인, Me = 로그인
  const [user, setUser] = useState<Me | null | undefined>(undefined);

  // 경로 변경 시마다 세션 재확인 — 로그인/로그아웃 후 헤더 즉시 갱신
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUser(data.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (user === undefined) {
    return <div className="h-5 w-16" aria-hidden />; // 로딩 자리(레이아웃 흔들림 방지)
  }

  if (user) {
    return (
      <div className="flex shrink-0 items-center gap-2 text-sm">
        {/* 팀 내부용 페이지라 다국어 없이 한국어 고정 */}
        {user.role === "admin" && (
          <Link
            href="/admin"
            className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-400 transition hover:border-indigo-300 hover:text-amber-600"
          >
            관리자
          </Link>
        )}
        <Link
          href="/profile"
          className="max-w-24 truncate font-semibold text-amber-600 transition hover:text-amber-700"
        >
          {user.nickname}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-3 text-sm text-slate-400">
      <Link
        href="/login"
        className={
          pathname.startsWith("/login")
            ? "font-semibold text-amber-600"
            : "transition hover:text-amber-600"
        }
      >
        {t("login")}
      </Link>
      <Link
        href="/signup"
        className="rounded-full bg-amber-400 px-3 py-1.5 font-bold text-slate-950 transition hover:bg-amber-300"
      >
        {t("signup")}
      </Link>
    </div>
  );
}
