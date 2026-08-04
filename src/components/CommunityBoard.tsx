"use client";

import { useEffect, useState, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Send, MessageSquare } from "lucide-react";

interface Post {
  id: number;
  author: string;
  body: string;
  createdAt: string;
}

const AUTHOR_MAX = 20;
const BODY_MAX = 200;
const NAME_KEY = "tournight.community.name";

/** 상대 시간 표기 (방금 전 / N분 전 …) — 접속 언어로 */
function useRelativeTime(locale: string) {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  return (iso: string) => {
    const diffMs = new Date(iso).getTime() - Date.now();
    const diffMin = Math.round(diffMs / 60000);
    if (Math.abs(diffMin) < 1) return rtf.format(0, "minute");
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
    const diffHr = Math.round(diffMin / 60);
    if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
    return rtf.format(Math.round(diffHr / 24), "day");
  };
}

export default function CommunityBoard() {
  const t = useTranslations("community");
  const locale = useLocale();
  const relative = useRelativeTime(locale);

  const [posts, setPosts] = useState<Post[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // 이름은 비제어 입력 + ref로 관리 — localStorage는 마운트 후에만 읽을 수 있어
  // 상태 대신 DOM에 직접 채운다(SSR 하이드레이션 불일치·불필요한 리렌더 방지).
  const nameRef = useRef<HTMLInputElement>(null);

  // 저장된 이름 복원 (로그인 대체)
  useEffect(() => {
    const saved = localStorage.getItem(NAME_KEY);
    if (saved && nameRef.current) nameRef.current.value = saved;
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/community")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setPosts(data.posts);
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = (nameRef.current?.value ?? "").trim();
    const trimmedBody = body.trim();
    if (!trimmedBody || submitting) return;
    if (!trimmedName) {
      nameRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: trimmedName, body: trimmedBody }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      localStorage.setItem(NAME_KEY, trimmedName);
      setPosts((prev) => [data.post, ...prev]);
      setBody("");
    } catch {
      alert(t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !!body.trim() && !submitting;

  return (
    <div className="space-y-8">
      {/* 작성 폼 */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
      >
        <input
          ref={nameRef}
          type="text"
          maxLength={AUTHOR_MAX}
          placeholder={t("namePlaceholder")}
          className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-300/60"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={BODY_MAX}
          rows={2}
          placeholder={t("bodyPlaceholder")}
          className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-300/60"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {body.length}/{BODY_MAX}
          </span>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={14} />
            {t("submit")}
          </button>
        </div>
      </form>

      {/* 목록 */}
      {status === "loading" ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]"
            />
          ))}
        </div>
      ) : status === "error" ? (
        <p className="py-10 text-center text-sm text-slate-500">{t("error")}</p>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <MessageSquare size={30} strokeWidth={1.5} className="text-slate-600" />
          <p className="text-sm text-slate-500">{t("empty")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li
              key={post.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-amber-300/90">
                  {post.author}
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {relative(post.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
                {post.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
