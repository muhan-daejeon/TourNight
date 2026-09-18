"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

interface Me {
  nickname: string;
  role?: "user" | "admin";
}

/**
 * 로그인 상태를 알아 와서 로그인/가입 링크 또는 관리자 배지를 보여준다.
 *
 * 로그인했을 때의 닉네임 인사말("안녕하세요, ○○님.")은 여기서 그리지 않고
 * Header.tsx가 찜 버튼 바로 위에 그린다 — onUser로 로그인한 사용자 정보를
 * 위로 올려 보내, /api/auth/me를 두 번 부르지 않고도 Header가 그 값을 안다.
 */
export default function AuthNav({ onUser }: { onUser?: (user: Me | null) => void }) {
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

  useEffect(() => {
    if (user !== undefined) onUser?.(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onUser는 Header에서 매 렌더 새로 만들어지는 setState 함수라 자체는 의존성에 안 넣는다
  }, [user]);

  if (user === undefined) {
    return <div className="h-5 w-16" aria-hidden />; // 로딩 자리(레이아웃 흔들림 방지)
  }

  if (user) {
    // 팀 내부용 페이지라 다국어 없이 한국어 고정
    return user.role === "admin" ? (
      <Link
        href="/admin"
        className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-400 transition hover:border-indigo-300 hover:text-amber-600"
      >
        관리자
      </Link>
    ) : null;
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
