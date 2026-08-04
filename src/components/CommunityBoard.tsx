"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Send,
  MessageSquare,
  MessageCircle,
  LogIn,
  Trash2,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

interface Post {
  id: number;
  userId: number | null;
  author: string;
  body: string;
  createdAt: string;
  commentCount: number;
}

interface Comment {
  id: number;
  userId: number | null;
  author: string;
  body: string;
  createdAt: string;
}

interface Me {
  id: number;
  nickname: string;
}

const BODY_MAX = 200;

/**
 * 상대 시간 표기 (방금 전 / N분 전 / … / 7일 넘으면 날짜) — 접속 언어로.
 */
function formatRelative(iso: string, locale: string, justNow: string): string {
  const past = new Date(iso).getTime();
  const diffSec = Math.round((Date.now() - past) / 1000);
  if (diffSec < 60) return justNow;

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return rtf.format(-diffHr, "hour");
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return rtf.format(-diffDay, "day");

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(past);
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-300/60";

function LoginPrompt({ text }: { text: string }) {
  const tAuth = useTranslations("auth");
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="text-sm text-slate-400">{text}</span>
      <Link
        href="/login"
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
      >
        <LogIn size={14} />
        {tAuth("login")}
      </Link>
    </div>
  );
}

/** 글 하나 + 댓글(펼쳐서 지연 로드). me가 없으면 비로그인 */
function PostItem({
  post,
  me,
  onDeleted,
}: {
  post: Post;
  me: Me | null | undefined;
  onDeleted: () => void;
}) {
  const t = useTranslations("community");
  const locale = useLocale();

  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">(
    "idle",
  );
  const [count, setCount] = useState(post.commentCount);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const ownsPost = post.userId != null && post.userId === me?.id;

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && comments === null) {
      setStatus("loading");
      fetch(`/api/community/${post.id}/comments`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          setComments(data.comments);
          setStatus("done");
        })
        .catch(() => setStatus("error"));
    }
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    const body = replyBody.trim();
    if (!body || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComments((prev) => [...(prev ?? []), data.comment]);
      setCount((c) => c + 1);
      setReplyBody("");
    } catch {
      alert(t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function deletePost() {
    if (deleting || !confirm(t("deleteConfirm"))) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/community/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDeleted(); // 부모 목록에서 제거 → 이 컴포넌트 언마운트
    } catch {
      alert(t("submitError"));
      setDeleting(false);
    }
  }

  async function deleteComment(commentId: number) {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      const res = await fetch(
        `/api/community/${post.id}/comments/${commentId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error();
      setComments((prev) => (prev ?? []).filter((c) => c.id !== commentId));
      setCount((c) => Math.max(0, c - 1));
    } catch {
      alert(t("submitError"));
    }
  }

  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-amber-300/90">
          {post.author}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-slate-500">
            {formatRelative(post.createdAt, locale, t("justNow"))}
          </span>
          {ownsPost && (
            <button
              type="button"
              onClick={deletePost}
              disabled={deleting}
              aria-label={t("delete")}
              className="text-slate-500 transition hover:text-rose-400 disabled:opacity-40"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
        {post.body}
      </p>

      <button
        type="button"
        onClick={toggle}
        className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-amber-300"
      >
        <MessageCircle size={14} />
        {count > 0 ? `${t("comments")} ${count}` : t("commentAdd")}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
          {status === "loading" ? (
            <p className="text-xs text-slate-500">…</p>
          ) : status === "error" ? (
            <p className="text-xs text-slate-500">{t("error")}</p>
          ) : comments && comments.length > 0 ? (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="rounded-lg bg-white/[0.03] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-300">
                      {c.author}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">
                        {formatRelative(c.createdAt, locale, t("justNow"))}
                      </span>
                      {c.userId != null && c.userId === me?.id && (
                        <button
                          type="button"
                          onClick={() => deleteComment(c.id)}
                          aria-label={t("delete")}
                          className="text-slate-500 transition hover:text-rose-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-300">
                    {c.body}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">{t("commentEmpty")}</p>
          )}

          {/* 답글 폼 — 로그인 시에만 */}
          {me ? (
            <form onSubmit={submitReply} className="flex gap-2">
              <input
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                maxLength={BODY_MAX}
                placeholder={t("commentPlaceholder")}
                className={`${inputClass} flex-1`}
              />
              <button
                type="submit"
                disabled={!replyBody.trim() || submitting}
                className="shrink-0 rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("commentSubmit")}
              </button>
            </form>
          ) : (
            <LoginPrompt text={t("loginToComment")} />
          )}
        </div>
      )}
    </li>
  );
}

export default function CommunityBoard() {
  const t = useTranslations("community");

  const [posts, setPosts] = useState<Post[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // undefined = 로딩, null = 비로그인, Me = 로그인
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) =>
        setMe(
          data.user ? { id: data.user.id, nickname: data.user.nickname } : null,
        ),
      )
      .catch(() => setMe(null));
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
    const trimmedBody = body.trim();
    if (!trimmedBody || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmedBody }),
      });
      if (res.status === 401) {
        setMe(null); // 세션 만료 → 로그인 유도로 전환
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPosts((prev) => [data.post, ...prev]);
      setBody("");
    } catch {
      alert(t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* 작성 영역 — 로그인 시 폼, 아니면 로그인 유도 */}
      {me === undefined ? (
        <div className="h-28 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
      ) : me ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
        >
          <p className="mb-2 text-xs text-slate-500">
            {t("postingAs")} ·{" "}
            <span className="text-amber-300/90">{me.nickname}</span>
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={BODY_MAX}
            rows={2}
            placeholder={t("bodyPlaceholder")}
            className="w-full resize-none rounded-lg border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-300/60"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {body.length}/{BODY_MAX}
            </span>
            <button
              type="submit"
              disabled={!body.trim() || submitting}
              className="flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={14} />
              {t("submit")}
            </button>
          </div>
        </form>
      ) : (
        <LoginPrompt text={t("loginToPost")} />
      )}

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
            <PostItem
              key={post.id}
              post={post}
              me={me}
              onDeleted={() =>
                setPosts((prev) => prev.filter((p) => p.id !== post.id))
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
