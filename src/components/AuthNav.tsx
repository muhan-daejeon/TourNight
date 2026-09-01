"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

interface Me {
  nickname: string;
  role?: "user" | "admin";
}

export default function AuthNav() {
  const t = useTranslations("auth");
  const locale = useLocale();
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // 로그인과 같은 이유로 전체 이동. 클라이언트 캐시에는 로그인 상태로 받아둔
    // 페이지들이 남아 있어, router.push로 옮기면 로그아웃했는데도 이전 화면이
    // 그대로 보일 수 있다. ?skipIntro=1 — 로그아웃 직후에도 인트로가 다시 뜨지
    // 않아야 한다 (IntroSequence 참고)
    window.location.assign(`/${locale}?skipIntro=1`);
  }

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
            className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-amber-300/60 hover:text-amber-300"
          >
            관리자
          </Link>
        )}
        <Link
          href="/profile"
          className="max-w-24 truncate font-semibold text-amber-300 transition hover:text-amber-200"
        >
          {user.nickname}
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1 text-slate-400 transition hover:text-white"
          aria-label={t("logout")}
        >
          <LogOut size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-3 text-sm text-slate-300">
      <Link
        href="/login"
        className={
          pathname.startsWith("/login")
            ? "font-semibold text-amber-300"
            : "transition hover:text-amber-300"
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
