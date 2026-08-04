"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { COUNTRIES } from "@/lib/countries";

const fieldClass =
  "w-full rounded-lg border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-300/60";

export default function SignupForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function errorText(code: string) {
    const messages = t.raw("errors") as Record<string, string>;
    return messages[code] ?? messages.generic;
  }

  const canSubmit =
    !!email.trim() && password.length >= 8 && !!nickname.trim() && !pending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          nickname,
          country: country || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(errorText(data.error ?? "generic"));
        return;
      }
      router.push("/");
      router.refresh();
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
        <p className="mt-1 text-xs text-slate-500">{t("passwordHint")}</p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-slate-300">
          {t("nickname")}
        </label>
        <input
          type="text"
          maxLength={20}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-slate-300">
          {t("country")}
        </label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
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

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-full bg-amber-400 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t("submitSignup")}
      </button>

      <p className="text-center text-sm text-slate-400">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-amber-300 hover:underline">
          {t("goLogin")}
        </Link>
      </p>
    </form>
  );
}
