"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessagesSquare,
  Route,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * 가입 후 둘러보기.
 *
 * 실제 화면을 돌면서 설명하므로 배경을 어둡게 덮지 않는다 — 가리면 보러 온 화면이
 * 안 보인다. 상자만 아래에 띄우고, 다음을 누르면 그 단계의 페이지로 이동한다.
 *
 * 진행 상태는 ?tour= 로 들고 다닌다. 새로고침·뒤로가기에도 살아남고 특정 단계를
 * 링크로 열 수 있다. 본 적 있는지는 users.tour_completed_at에 남긴다.
 */
const STEPS: { key: string; href: string; Icon: LucideIcon }[] = [
  { key: "spots", href: "/spots", Icon: MapPin },
  { key: "courses", href: "/courses", Icon: Route },
  { key: "etiquette", href: "/etiquette", Icon: Sparkles },
  { key: "community", href: "/community", Icon: MessagesSquare },
];

/**
 * 하이라이트 대상 표식.
 * - data-tour     : 그 페이지의 본문 영역. 이 위치로 스크롤한다.
 * - data-tour-nav : 헤더의 해당 탭. 위치가 고정이라 구멍만 뚫고 스크롤 계산에선 뺀다.
 */
const targetOf = (key: string) => `[data-tour="${key}"]`;

/** 지금 단계에 해당하는 헤더 탭만 함께 밝힌다 (어느 메뉴 얘기인지 보이도록) */
const navTargetOf = (key: string) => `[data-tour-nav="${key}"]`;

/** 구멍 주위 여백 */
const PAD = 8;

/**
 * 스크롤할 때 위쪽에 비워둘 높이.
 * 헤더가 sticky라 scrollIntoView를 그냥 쓰면 대상이 헤더 밑으로 들어가 버리고,
 * 구멍에는 대상 대신 헤더가 드러난다.
 */
const HEADER_OFFSET = 104;

/** clip-path용 둥근 사각형 한 조각 (r=0이면 각진 사각형) */
function rectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  if (rad === 0) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return (
    `M${x + rad} ${y}H${x + w - rad}A${rad} ${rad} 0 0 1 ${x + w} ${y + rad}` +
    `V${y + h - rad}A${rad} ${rad} 0 0 1 ${x + w - rad} ${y + h}` +
    `H${x + rad}A${rad} ${rad} 0 0 1 ${x} ${y + h - rad}` +
    `V${y + rad}A${rad} ${rad} 0 0 1 ${x + rad} ${y}Z`
  );
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** 투어를 띄우지 않는 화면 — 로그인 전이거나 입력 중인 곳 */
const EXCLUDED = ["/login", "/signup", "/profile"];

type Phase = "start" | "done" | number;

function parsePhase(raw: string | null): Phase | null {
  if (raw === "start" || raw === "done") return raw;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= STEPS.length ? n : null;
}

function TourBox() {
  const t = useTranslations("tour");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const boxRef = useRef<HTMLDivElement>(null);

  const urlPhase = parsePhase(params.get("tour"));
  // 하이라이트할 영역 (뷰포트 기준). 대상이 없으면 화면 전체를 흐리게 한다
  // 어느 단계에서 잰 값인지 함께 담는다 — 단계가 바뀐 직후 옛 구멍이 한 프레임
  // 남는 걸 막는다 (효과 안에서 굳이 null로 비우지 않아도 된다)
  const [hole, setHole] = useState<{ phase: number; boxes: Box[] } | null>(null);
  // 아직 본 적 없는 계정이면 홈에 도착했을 때 저절로 시작한다
  const [autoStart, setAutoStart] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (urlPhase || closed || pathname !== "/") return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.user && !data.user.tourCompleted) {
          setAutoStart(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [urlPhase, closed, pathname]);

  const phase: Phase | null = urlPhase ?? (autoStart ? "start" : null);
  const visible = phase !== null && !closed && !EXCLUDED.includes(pathname);

  /** 본 것으로 기록하고 상자를 닫는다 (완료·건너뛰기 공통) */
  const finish = useCallback(
    (goHome: boolean) => {
      setClosed(true);
      setAutoStart(false);
      fetch("/api/auth/tour", { method: "POST" }).catch(() => {});
      if (goHome) router.push("/");
    },
    [router],
  );

  const goTo = useCallback(
    (next: Phase) => {
      setAutoStart(false);
      if (next === "done") {
        router.push("/?tour=done");
        return;
      }
      if (next === "start") {
        router.push("/?tour=start");
        return;
      }
      router.push(`${STEPS[next - 1].href}?tour=${next}`);
    },
    [router],
  );

  const prev = useCallback(() => {
    if (typeof phase !== "number") {
      if (phase === "done") goTo(STEPS.length);
      return;
    }
    goTo(phase === 1 ? "start" : phase - 1);
  }, [phase, goTo]);

  const next = useCallback(() => {
    if (phase === "start") return goTo(1);
    if (phase === "done") return finish(false);
    if (typeof phase === "number") {
      return goTo(phase === STEPS.length ? "done" : phase + 1);
    }
  }, [phase, goTo, finish]);

  /**
   * 하이라이트 대상의 위치를 잰다.
   *
   * 페이지를 막 옮겨온 직후라 대상이 아직 하이드레이션 전일 수 있어, 잠깐 동안
   * 매 프레임 다시 찾는다. 찾으면 화면 가운데로 스크롤하고 위치가 멎을 때까지
   * 계속 잰다 (부드러운 스크롤 중에도 구멍이 따라붙어야 한다).
   */
  useEffect(() => {
    if (!visible || typeof phase !== "number") return;
    const step = phase;
    const key = STEPS[step - 1].key;

    let raf = 0;
    let scrolled = false;
    const deadline = performance.now() + 2500;

    const rectsOf = (sel: string) =>
      [...document.querySelectorAll(sel)]
        .map((el) => el.getBoundingClientRect())
        // 화면에서 접힌 요소(좁은 화면의 헤더 탭 등)는 구멍을 뚫을 게 없다
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ top: r.top, left: r.left, width: r.width, height: r.height }));

    /** 본문 대상 + 헤더 탭을 모아 각각의 구멍으로 쓴다 */
    const measure = () => {
      const content = rectsOf(targetOf(key));
      if (!content.length) return null;
      return { content, all: [...content, ...rectsOf(navTargetOf(key))] };
    };

    const tick = () => {
      const m = measure();
      if (m) {
        if (!scrolled) {
          scrolled = true;
          // 스크롤 위치는 본문 대상만으로 정한다 — 헤더 탭은 늘 화면 위에 붙어 있어
          // 함께 계산하면 항상 맨 위로 올라가 버린다
          const top = Math.min(...m.content.map((b) => b.top));
          const bottom = Math.max(...m.content.map((b) => b.top + b.height));
          const span = bottom - top;
          const room = window.innerHeight - HEADER_OFFSET;
          // 대상 전체가 들어가면 가운데로, 넘치면 첫 부분이 헤더 아래 오도록
          const target =
            span < room
              ? window.scrollY + top - HEADER_OFFSET - (room - span) / 2
              : window.scrollY + top - HEADER_OFFSET;
          window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
        }
        setHole({ phase: step, boxes: m.all });
      }
      // 스크롤이 멎을 때까지는 계속 따라간다
      if (performance.now() < deadline) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // 스크롤·창 크기 변화에도 구멍이 어긋나지 않게
    const follow = () => {
      const m = measure();
      if (m) setHole({ phase: step, boxes: m.all });
    };
    window.addEventListener("scroll", follow, { passive: true });
    window.addEventListener("resize", follow);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", follow);
      window.removeEventListener("resize", follow);
    };
  }, [visible, phase]);

  // 상자가 뜨면 그리로 포커스를 옮긴다 (키보드·스크린리더 사용자가 바로 조작)
  useEffect(() => {
    if (visible) boxRef.current?.focus();
  }, [visible, phase]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, next, prev, finish]);

  if (!visible || phase === null) return null;

  const isStep = typeof phase === "number";
  const step = isStep ? STEPS[phase - 1] : null;
  const Icon = step?.Icon;
  const body =
    phase === "start"
      ? { title: t("welcome.title"), text: t("welcome.body") }
      : phase === "done"
        ? { title: t("done.title"), text: t("done.body") }
        : { title: t(`steps.${step!.key}.title`), text: t(`steps.${step!.key}.body`) };

  // 이번 단계에서 잰 값만 쓴다 (환영·완료 단계에는 구멍이 없다)
  const boxes = isStep && hole?.phase === phase ? hole.boxes : null;

  const veil =
    "fixed inset-0 z-[55] bg-slate-950/55 backdrop-blur-[3px]";

  /**
   * 흐림막 한 장에 구멍을 여러 개 뚫는다.
   *
   * 처음엔 위·아래·좌·우 네 조각으로 덮었는데, 그 방식은 구멍이 하나일 때만 된다.
   * 화면 전체 사각형 뒤에 구멍 사각형들을 이어 붙이고 evenodd를 주면 안쪽이
   * 뚫린다 — backdrop-filter도 clip-path를 따른다.
   */
  const clip = boxes
    ? `path(evenodd, "${rectPath(0, 0, window.innerWidth, window.innerHeight, 0)}${boxes
        .map((b) =>
          rectPath(b.left - PAD, b.top - PAD, b.width + PAD * 2, b.height + PAD * 2, 14),
        )
        .join("")}")`
    : undefined;

  // 구멍들이 화면 위쪽에 몰려 있으면 상자를 아래에, 아래쪽이면 위에 둔다
  // 헤더 탭(맨 위)은 빼고 본문 구멍만으로 판단한다
  const contentBoxes = boxes?.filter((b) => b.top > HEADER_OFFSET) ?? [];
  const midY = contentBoxes.length
    ? contentBoxes.reduce((acc, b) => acc + b.top + b.height / 2, 0) /
      contentBoxes.length
    : 0;
  const boxAtBottom = !boxes || midY < window.innerHeight / 2;

  return (
    <>
      <div className={veil} style={clip ? { clipPath: clip } : undefined} />
      {/* 구멍 테두리 — 어디를 보라는 건지 분명하게 */}
      {boxes?.map((b, i) => (
        <div
          key={i}
          aria-hidden
          className="pointer-events-none fixed z-[56] rounded-[14px] ring-2 ring-amber-400/80"
          style={{
            top: b.top - PAD,
            left: b.left - PAD,
            width: b.width + PAD * 2,
            height: b.height + PAD * 2,
          }}
        />
      ))}

    <div
      ref={boxRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-label={t("label")}
      className={
        boxes
          ? `fixed inset-x-0 z-[60] px-4 outline-none sm:inset-x-auto sm:left-1/2 sm:w-[400px] sm:-translate-x-1/2 ${boxAtBottom ? "bottom-6" : "top-32"}`
          : // 환영·완료는 화면 한가운데 (첫 화면에서 눈에 바로 들어와야 한다)
            "fixed inset-0 z-[60] flex items-center justify-center px-4 outline-none"
      }
    >
      <div className={boxes ? "" : "w-full sm:w-[420px]"}>
      <div className="rounded-2xl border border-amber-400/25 bg-slate-950/95 p-5 shadow-[0_12px_48px_rgba(0,0,0,0.7)] backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={15} className="shrink-0 text-amber-300" />}
            {isStep && (
              <span className="text-[11px] font-bold tracking-wide text-amber-300">
                {phase} / {STEPS.length}
              </span>
            )}
          </div>
          {/* 완료 화면에는 '닫기' 버튼이 따로 있어 X는 같은 이름의 중복 컨트롤이 된다 */}
          {phase !== "done" && (
            <button
              type="button"
              onClick={() => finish(false)}
              aria-label={t("close")}
              className="-mr-1 -mt-1 rounded-full p-1 text-slate-500 transition hover:text-white"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <h2 className="mt-2 text-base font-bold leading-snug text-white">
          {body.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{body.text}</p>

        <div className="mt-5 flex items-center gap-2">
          {phase === "done" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  finish(false);
                  router.push("/courses");
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
              >
                {t("done.cta")}
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => finish(false)}
                className="rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:text-white"
              >
                {t("close")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => finish(true)}
                className="mr-auto text-xs font-semibold text-slate-500 transition hover:text-slate-300"
              >
                {t("skip")}
              </button>
              {phase !== "start" && (
                <button
                  type="button"
                  onClick={prev}
                  aria-label={t("prev")}
                  className="rounded-full border border-white/15 p-2 text-slate-300 transition hover:text-white"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-1 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
              >
                {phase === "start" ? t("begin") : t("next")}
                <ChevronRight size={15} />
              </button>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
    </>
  );
}

/** useSearchParams는 프리렌더 중 Suspense 경계가 필요하다 */
export default function OnboardingTour() {
  return (
    <Suspense fallback={null}>
      <TourBox />
    </Suspense>
  );
}
