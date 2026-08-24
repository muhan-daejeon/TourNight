"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Compass, LogIn } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import { Link, useRouter } from "@/i18n/navigation";

interface User {
  id: number;
  email: string;
  nickname: string;
  country: string | null;
}

const fieldClass =
  "w-full rounded-lg border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-300/60";

export default function ProfileForm({ welcome = false }: { welcome?: boolean }) {
  const t = useTranslations("auth");
  const tTour = useTranslations("tour");
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [nickname, setNickname] = useState("");
  const [country, setCountry] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user ?? null);
        if (data.user) {
          setNickname(data.user.nickname);
          setCountry(data.user.country ?? "");
        }
      })
      .catch(() => setUser(null));
  }, []);

  function errorText(code: string) {
    const messages = t.raw("errors") as Record<string, string>;
    return messages[code] ?? messages.generic;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !nickname.trim()) return;
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, country: country || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(errorText(data.error ?? "generic"));
        return;
      }
      setUser(data.user);
      setSaved(true);
      router.refresh(); // 헤더 닉네임 갱신
      // 가입 직후 국가 입력(welcome)은 여기서 끝 — 프로필에 머무르지 않고 메인으로 보낸다.
      // replace라 뒤로가기로 가입 플로우에 다시 갇히지 않는다.
      if (welcome) router.replace("/");
    } catch {
      setError(errorText("generic"));
    } finally {
      setPending(false);
    }
  }

  if (user === undefined) {
    return (
      <div className="h-56 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
    );
  }

  if (user === null) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <span className="text-sm text-slate-400">{t("loginRequired")}</span>
        <Link
          href="/login"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
        >
          <LogIn size={14} />
          {t("login")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {welcome && !user.country && (
        <p className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-200">
          {t("welcomeCountryPrompt")}
        </p>
      )}
      <div>
        <label className="mb-1.5 block text-sm text-slate-300">
          {t("email")}
        </label>
        <input
          type="email"
          value={user.email}
          disabled
          className={`${fieldClass} cursor-not-allowed opacity-60`}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-slate-300">
          {t("nickname")}
        </label>
        <input
          type="text"
          maxLength={20}
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setSaved(false);
          }}
          className={fieldClass}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-slate-300">
          {t("country")}
        </label>
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setSaved(false);
          }}
          className={`${fieldClass} appearance-none`}
        >
          <option value="">{t("countryPlaceholder")}</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      {saved && <p className="text-sm text-emerald-400">{t("saved")}</p>}

      <button
        type="submit"
        disabled={pending || !nickname.trim()}
        className="w-full rounded-full bg-amber-400 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {welcome ? t("saveAndStart") : t("save")}
      </button>

      {/* 둘러보기는 한 번 닫으면 저절로 다시 뜨지 않으므로, 돌아올 길을 여기 둔다.
          가입 직후(welcome) 화면에서는 아직 볼 차례가 아니라 숨긴다 */}
      {!welcome && (
        <button
          type="button"
          onClick={() => router.push("/?tour=start")}
          className="flex w-full items-center justify-center gap-1.5 rounded-full border border-white/15 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-amber-400/50 hover:text-amber-300"
        >
          <Compass size={15} />
          {tTour("replay")}
        </button>
      )}

      {/* 국가는 선택 사항이라, 입력 없이도 가입 흐름을 끝낼 수 있어야 한다 */}
      {welcome && (
        <button
          type="button"
          onClick={() => router.replace("/")}
          className="w-full py-1 text-center text-sm text-slate-400 transition hover:text-slate-200"
        >
          {t("skipForNow")}
        </button>
      )}
    </form>
  );
}
