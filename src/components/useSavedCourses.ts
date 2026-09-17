"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Course } from "@/lib/courses";

/**
 * 찜한 코스 — 명소 찜(useBookmarks)과 같은 자리(브라우저)에 둔다.
 *
 * 명소는 id만 저장하고 실물은 API로 다시 받지만, 코스는 그럴 수 없다.
 * 추천 코스는 명소 묶음이 바뀌면 id가 달라지고 AI·설문 코스는 아예
 * 서버에 없어서, 다시 받을 방법이 없기 때문이다. 그래서 화면에 필요한
 * 만큼(제목·경유지 이름·사진·좌표)만 통째로 담아 둔다.
 *
 * 키에 버전을 붙여 구조가 바뀌면 옛 저장본이 화면을 깨뜨리지 않고 무시된다.
 */
const KEY = "tournight:savedCourses:v1";

/** 찜 목록에 그릴 만큼만 간추린 코스 */
export interface SavedCourse {
  /** 코스 id — 추천 코스는 그 코스의 id, AI·설문 코스는 생성 시점 id */
  id: string;
  /** 화면에 쓸 이름 (없으면 경유지를 이어 만든다) */
  title: string;
  /** 어디서 온 코스인지 — 목록에서 배지로 구분하고 다시 열 때 경로가 달라진다 */
  kind: "recommended" | "ai" | "survey" | "persona";
  stops: { contentId: string; title: string; imageUrl: string | null }[];
  totalM: number;
  /** 저장 시각 (최근 찜이 위로) */
  savedAt: number;
  /** 저장 당시 보던 언어 — 다른 언어로 보면 이름이 어색해 표시만 해 둔다 */
  locale: string;
}

const listeners = new Set<() => void>();
/** getSnapshot은 매번 같은 참조여야 한다 (무한 렌더 방지) */
let cache: SavedCourse[] | null = null;

function read(): SavedCourse[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed)
      ? parsed.filter(
          (c): c is SavedCourse =>
            !!c && typeof c.id === "string" && Array.isArray(c.stops),
        )
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: SavedCourse[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 사생활 보호 모드·용량 초과 — 화면 상태만 유지하고 넘어간다
  }
  listeners.forEach((fn) => fn());
}

const EMPTY: SavedCourse[] = [];

/** Course(전체)를 찜 목록에 담을 만큼만 간추린다 */
export function toSavedCourse(
  course: Course,
  kind: SavedCourse["kind"],
  locale: string,
  title?: string,
): SavedCourse {
  return {
    id: course.id,
    title: title?.trim() || course.stops.map((s) => s.title).join(" → "),
    kind,
    stops: course.stops.map((s) => ({
      contentId: s.contentId,
      title: s.title,
      imageUrl: s.imageUrl,
    })),
    totalM: course.totalM,
    savedAt: Date.now(),
    locale,
  };
}

export function useSavedCourses() {
  const courses = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      // 다른 탭에서 찜했을 때도 따라간다
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) {
          cache = null;
          onChange();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    read,
    () => EMPTY, // 서버에는 저장소가 없다 — 하이드레이션 후 실제 목록으로 맞춰진다
  );

  /** 같은 id가 있으면 빼고(찜 해제), 없으면 맨 앞에 담는다 */
  const toggle = useCallback((course: SavedCourse) => {
    const now = read();
    write(
      now.some((c) => c.id === course.id)
        ? now.filter((c) => c.id !== course.id)
        : [course, ...now],
    );
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((c) => c.id !== id));
  }, []);

  return { courses, toggle, remove };
}
