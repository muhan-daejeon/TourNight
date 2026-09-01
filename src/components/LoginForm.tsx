"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

const fieldClass =
  "w-full rounded-lg border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-300/60";

export default function LoginForm({
  oauthError = false,
}: {
  oauthError?: boolean;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // OAuth 콜백 실패로 넘어온 경우 초기 에러 표시
  const [error, setError] = useState<string | null>(
    oauthError ? (t.raw("errors") as Record<string, string>).oauth : null,
  );
  const [pending, setPending] = useState(false);

  function errorText(code: string) {
    const messages = t.raw("errors") as Record<string, string>;
    return messages[code] ?? messages.generic;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !email.trim() || !password) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(errorText(data.error ?? "generic"));
        return;
      }
      // 로그인·로그아웃은 클라이언트 이동(router.push)으로 처리하면 안 된다.
      // 헤더의 홈 링크가 로그인 화면에서 이미 "/"를 프리페치해 두는데, 그때는
      // 비로그인이라 미들웨어가 로그인 페이지로 돌려보낸 응답이 클라이언트 캐시에
      // 담긴다. 로그인 직후 push("/")는 그 캐시를 그대로 써서 로그인 화면이
      // 다시 보인다 (하드 새로고침해야 풀리던 증상).
      // router.refresh()는 "현재 라우트"의 캐시만 지우므로 이동 대상에는 소용없다.
      // 전체 이동으로 미들웨어를 새로 태우고 캐시를 우회한다.
      // ?skipIntro=1 — 로그인 직후엔 인트로가 다시 뜨지 않아야 한다 (IntroSequence 참고)
      window.location.assign(`/${locale}?skipIntro=1`);
    } catch {
      setError(errorText("generic"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm text-slate-300">
          {t("email")}
        </label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-slate-300">
          {t("password")}
        </label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={pending || !email.trim() || !password}
        className="w-full rounded-full bg-amber-400 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t("submitLogin")}
      </button>

      <p className="text-center text-sm text-slate-400">
        {t("noAccount")}{" "}
        <Link href="/signup" className="font-semibold text-amber-300 hover:underline">
          {t("goSignup")}
        </Link>
      </p>
    </form>
  );
}
