"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import {
  Send,
  MessageSquare,
  MessageCircle,
  LogIn,
  MailCheck,
  Flag,
  BadgeCheck,
  Trash2,
  ImagePlus,
  X,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { photoErrorMessage, usePhotoAttach } from "./usePhotoAttach";

interface Post {
  id: number;
  userId: number | null;
  author: string;
  body: string;
  createdAt: string;
  commentCount: number;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  authorVerified: boolean;
}

interface Comment {
  id: number;
  userId: number | null;
  author: string;
  body: string;
  createdAt: string;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  authorVerified: boolean;
}

interface Me {
  id: number;
  nickname: string;
  /** 메일 인증 완료 여부 — 글·댓글 작성 조건 */
  emailVerified: boolean;
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

/** 메일 인증을 마친 작성자 표시 — 신원 보증이 아니라 '연락 가능한 계정'이라는 뜻 */
function VerifiedBadge() {
  const t = useTranslations("community");
  return (
    <span title={t("verifiedBadgeHint")} className="inline-flex shrink-0">
      <BadgeCheck size={13} className="text-sky-400" aria-label={t("verifiedBadge")} />
    </span>
  );
}

/** 신고 버튼 — 사유를 고르면 바로 접수된다 */
function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "post" | "comment";
  targetId: number;
}) {
  const t = useTranslations("community");
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  const REASONS = ["spam", "abuse", "sexual", "privacy", "other"] as const;

  async function send(reason: string) {
    setOpen(false);
    try {
      const res = await fetch("/api/community/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason }),
      });
      if (res.status === 401) {
        alert(t("loginToPost"));
        return;
      }
      const data = await res.json().catch(() => ({}));
      setDone(true);
      alert(data.duplicate ? t("reportAlready") : t("reportDone"));
    } catch {
      alert(t("submitError"));
    }
  }

  if (done) {
    return (
      <span className="shrink-0 text-[11px] text-slate-600">
        {t("reportedLabel")}
      </span>
    );
  }

  return (
    <span className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("report")}
        aria-expanded={open}
        className="rounded-full p-1 text-slate-600 transition hover:text-rose-300"
      >
        <Flag size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-20 w-36 overflow-hidden rounded-xl border border-white/15 bg-slate-900 shadow-xl">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => send(r)}
              className="block w-full px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              {t(`reportReasons.${r}`)}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

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

/** 인증 결과 문구 — /api/auth/verify가 ?verified=… 를 붙여 여기로 돌려보낸다 */
const VERIFY_MESSAGE: Record<string, { key: string; good: boolean }> = {
  ok: { key: "verifyDone", good: true },
  already: { key: "verifyAlready", good: true },
  expired: { key: "verifyExpired", good: false },
  invalid: { key: "verifyInvalid", good: false },
};

function VerifyResultInner() {
  const t = useTranslations("community");
  const status = useSearchParams().get("verified");
  const message = status ? VERIFY_MESSAGE[status] : null;
  if (!message) return null;

  return (
    <p
      className={`rounded-xl border px-4 py-3 text-sm ${
        message.good
          ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200"
          : "border-rose-400/25 bg-rose-400/[0.06] text-rose-200"
      }`}
    >
      {t(message.key)}
    </p>
  );
}

/**
 * useSearchParams는 프리렌더 중 Suspense 경계가 필요하다. 배너만 감싸 두면
 * 페이지 나머지는 그대로 정적으로 남는다.
 */
function VerifyResultBanner() {
  return (
    <Suspense fallback={null}>
      <VerifyResultInner />
    </Suspense>
  );
}

/**
 * 메일 인증 안내 — 로그인은 했지만 아직 인증 전인 계정에 작성 폼 대신 보여준다.
 *
 * 메일이 안 왔을 때 사용자가 할 수 있는 일이 '다시 보내기'뿐이라 버튼을 같이 둔다.
 * 재발송 간격·일일 상한은 서버가 걸고, 여기서는 결과만 문구로 알린다.
 */
function VerifyPrompt({ mailFrom }: { mailFrom: string | null }) {
  const t = useTranslations("community");
  const [state, setState] = useState<
    "idle" | "sending" | "sent" | "limited" | "error"
  >("idle");

  async function resend() {
    if (state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/auth/verify/resend", { method: "POST" });
      setState(res.ok ? "sent" : res.status === 429 ? "limited" : "error");
    } catch {
      setState("error");
    }
  }

  const note =
    state === "sent"
      ? t("verifyResent")
      : state === "limited"
        ? t("verifyTooOften")
        : state === "error"
          ? t("verifyResendFailed")
          : null;

  return (
    <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <MailCheck size={16} className="mt-0.5 shrink-0 text-amber-300" />
          <p className="text-sm text-slate-300">{t("verifyRequired")}</p>
        </div>
        <button
          type="button"
          onClick={resend}
          disabled={state === "sending" || state === "sent"}
          className="shrink-0 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === "sending" ? t("verifySending") : t("verifyResend")}
        </button>
      </div>
      {/* 스팸함 안내 + 발신 주소. 일본 캐리어 메일은 기본이 '모르는 도메인 차단'이라
          이 주소를 수신 허용에 넣지 않으면 아예 도착하지 않는다 */}
      <p className="mt-2.5 pl-6 text-xs leading-relaxed text-slate-400">
        {t("verifySpamHint")}
        {mailFrom && (
          <>
            <br />
            <span className="text-slate-500">{t("verifyFrom")} </span>
            <span className="font-semibold text-amber-200/90">{mailFrom}</span>
          </>
        )}
      </p>
      {note && <p className="mt-2 pl-6 text-xs text-slate-300">{note}</p>}
    </div>
  );
}

/** 글 하나 + 댓글(펼쳐서 지연 로드). me가 없으면 비로그인 */
function PostItem({
  post,
  me,
  canAttach,
  onDeleted,
}: {
  post: Post;
  me: Me | null | undefined;
  canAttach: boolean;
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
  const [lightbox, setLightbox] = useState(false);
  // 댓글 첨부 — 글 작성과 같은 훅을 쓴다
  const {
    photo,
    clear: clearPhoto,
    pick: pickPhoto,
    inputRef: photoInputRef,
    requestInit: photoRequestInit,
  } = usePhotoAttach({
    tooLarge: t("photoTooLarge"),
    unsupported: t("photoUnsupported"),
    generic: t("submitError"),
  });

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
      const res = await fetch(
        `/api/community/${post.id}/comments`,
        photoRequestInit(body),
      );
      const photoErr = photoErrorMessage(res.status, {
        rejected: t("photoRejected"),
        tooLarge: t("photoTooLarge"),
        unsupported: t("photoUnsupported"),
      });
      if (photoErr) {
        alert(photoErr);
        return;
      }
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        alert(t("limitReached", { limit: data.limit ?? 0 }));
        return;
      }
      if (res.status === 422) {
        alert(t("textRejected"));
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComments((prev) => [...(prev ?? []), data.comment]);
      setCount((c) => c + 1);
      setReplyBody("");
      clearPhoto();
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
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-amber-300/90">
          <span className="truncate">{post.author}</span>
          {post.authorVerified && <VerifiedBadge />}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-slate-500">
            {formatRelative(post.createdAt, locale, t("justNow"))}
          </span>
          {me && !ownsPost && (
            <ReportButton targetType="post" targetId={post.id} />
          )}
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

      {/* 첨부 사진 — 눌러서 원본 크기로 */}
      {post.mediaUrl && post.mediaType === "image" && (
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="mt-3 block overflow-hidden rounded-xl border border-white/10 transition hover:border-white/25"
        >
          <Image
            src={post.mediaUrl}
            alt=""
            width={640}
            height={480}
            sizes="(max-width: 640px) 100vw, 640px"
            className="max-h-80 w-auto object-cover"
          />
        </button>
      )}

      {lightbox && post.mediaUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
        >
          <Image
            src={post.mediaUrl}
            alt=""
            width={1600}
            height={1200}
            sizes="100vw"
            className="max-h-full w-auto object-contain"
          />
          <button
            type="button"
            aria-label={t("photoClose")}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>
      )}

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
                    <span className="flex min-w-0 items-center gap-1 text-xs font-semibold text-slate-300">
                      <span className="truncate">{c.author}</span>
                      {c.authorVerified && <VerifiedBadge />}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">
                        {formatRelative(c.createdAt, locale, t("justNow"))}
                      </span>
                      {me && c.userId !== me.id && (
                        <ReportButton targetType="comment" targetId={c.id} />
                      )}
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
                  {c.mediaUrl && c.mediaType === "image" && (
                    <a
                      href={c.mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 block w-fit overflow-hidden rounded-lg border border-white/10 transition hover:border-white/25"
                    >
                      <Image
                        src={c.mediaUrl}
                        alt=""
                        width={320}
                        height={240}
                        sizes="320px"
                        className="max-h-40 w-auto object-cover"
                      />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">{t("commentEmpty")}</p>
          )}

          {/* 답글 폼 — 로그인만 하면 쓸 수 있다. 인증 안내는 위 작성 영역에 이미 있다 */}
          {me ? (
            <>
            {photo && (
              <div className="relative w-fit">
                {/* 로컬 objectURL이라 next/image 대신 img */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.preview}
                  alt=""
                  className="max-h-28 rounded-lg border border-white/10"
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  aria-label={t("photoRemove")}
                  className="absolute -right-2 -top-2 rounded-full bg-slate-900 p-1 text-slate-300 shadow-lg ring-1 ring-white/15 transition hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <form onSubmit={submitReply} className="flex gap-2">
              <input
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                maxLength={BODY_MAX}
                placeholder={t("commentPlaceholder")}
                className={`${inputClass} flex-1`}
              />
              {canAttach && (
                <>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={pickPhoto}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={submitting}
                    aria-label={t("photoAdd")}
                    className="shrink-0 rounded-lg border border-white/15 px-2.5 py-2 text-slate-300 transition hover:border-white/30 hover:text-white disabled:opacity-40"
                  >
                    <ImagePlus size={14} />
                  </button>
                </>
              )}
              <button
                type="submit"
                disabled={!replyBody.trim() || submitting}
                className="shrink-0 rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("commentSubmit")}
              </button>
            </form>
            </>
          ) : (
            <LoginPrompt text={t("loginToComment")} />
          )}
        </div>
      )}
    </li>
  );
}

export default function CommunityBoard({
  initialPosts,
  canAttach,
  mailFrom,
}: {
  /** 서버에서 렌더링한 글 목록 — 첫 화면부터 보이도록 초기값으로 쓴다 */
  initialPosts: Post[];
  /** 스토리지 미설정 서버면 false → 첨부 UI 자체를 숨긴다 */
  canAttach: boolean;
  /** 인증 메일 발신 주소 (미설정이면 null) — 수신 허용 안내에 쓴다 */
  mailFrom: string | null;
}) {
  const t = useTranslations("community");

  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // undefined = 로딩, null = 비로그인, Me = 로그인
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  // canAttach는 서버에서 내려받는다 (스토리지 키 유무는 서버만 안다)
  const {
    photo,
    clear: clearPhoto,
    pick: pickPhoto,
    inputRef: photoInputRef,
    requestInit: photoRequestInit,
  } = usePhotoAttach({
    tooLarge: t("photoTooLarge"),
    unsupported: t("photoUnsupported"),
    generic: t("submitError"),
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) =>
        setMe(
          data.user
            ? {
                id: data.user.id,
                nickname: data.user.nickname,
                emailVerified: !!data.user.emailVerified,
              }
            : null,
        ),
      )
      .catch(() => setMe(null));
  }, []);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/community", photoRequestInit(trimmedBody));
      if (res.status === 401) {
        setMe(null); // 세션 만료 → 로그인 유도로 전환
        return;
      }
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        alert(t("limitReached", { limit: data.limit ?? 0 }));
        return;
      }
      if (res.status === 422) {
        alert(t("textRejected"));
        return;
      }
      const photoErr = photoErrorMessage(res.status, {
        rejected: t("photoRejected"),
        tooLarge: t("photoTooLarge"),
        unsupported: t("photoUnsupported"),
      });
      if (photoErr) {
        alert(photoErr);
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPosts((prev) => [data.post, ...prev]);
      setBody("");
      clearPhoto();
    } catch {
      alert(t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* 메일 인증 링크를 타고 돌아왔을 때의 결과 안내 */}
      <VerifyResultBanner />

      {/* 작성 영역 — 로그인만 하면 쓸 수 있고, 미인증이면 한도가 낮다는 안내만 얹는다 */}
      {me === undefined ? (
        <div className="h-28 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
      ) : me ? (
        <div className="space-y-3">
        {!me.emailVerified && <VerifyPrompt mailFrom={mailFrom} />}
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
          {/* 첨부 미리보기 */}
          {photo && (
            <div className="relative mt-3 w-fit">
              {/* 로컬 objectURL이라 next/image 대신 img 사용 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.preview}
                alt=""
                className="max-h-44 rounded-lg border border-white/10"
              />
              <button
                type="button"
                onClick={clearPhoto}
                aria-label={t("photoRemove")}
                className="absolute -right-2 -top-2 rounded-full bg-slate-900 p-1.5 text-slate-300 shadow-lg ring-1 ring-white/15 transition hover:text-white"
              >
                <X size={13} />
              </button>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {canAttach && (
                <>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={pickPhoto}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={submitting}
                    className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-white/30 hover:text-white disabled:opacity-40"
                  >
                    <ImagePlus size={14} />
                    {t("photoAdd")}
                  </button>
                </>
              )}
              <span className="text-xs text-slate-500">
                {body.length}/{BODY_MAX}
              </span>
            </div>
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
        </div>
      ) : (
        <LoginPrompt text={t("loginToPost")} />
      )}

      {/* 목록 — 서버에서 채워 오므로 로딩 상태가 없다.
          조회에 실패하면 listPosts가 빈 배열을 주고 아래 빈 상태로 표시된다 */}
      {posts.length === 0 ? (
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
              canAttach={canAttach}
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
