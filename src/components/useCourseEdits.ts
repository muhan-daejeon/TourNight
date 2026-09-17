"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Course, CourseStop } from "@/lib/courses";
import { rebuildCourse } from "@/lib/course-edit";

/**
 * 내가 고친 코스 — 경유지를 더하거나 빼고 순서를 바꾼 결과를 브라우저에 남긴다.
 *
 * 코스 자체를 통째로 저장하지 않고 "경유지 contentId 순서"만 담는다. 제목·주소는
 * 보는 언어에 따라 달라지고 사진 주소도 바뀔 수 있어서, 통째로 박제해 두면
 * 언어를 바꾸는 순간 옛 언어가 그대로 남는다. id만 두면 그때그때 지금 화면의
 * 명소 목록에서 다시 이어 붙이면 된다.
 *
 * 키에 버전을 붙여 구조가 바뀌면 옛 저장본이 화면을 깨뜨리지 않고 무시된다.
 */
const KEY = "tournight:courseEdits:v1";

/** 코스 id → 내가 정한 경유지 순서 */
type Edits = Record<string, { ids: string[]; at: number }>;

const listeners = new Set<() => void>();
/** getSnapshot은 매번 같은 참조여야 한다 (무한 렌더 방지) */
let cache: Edits | null = null;

function read(): Edits {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    cache =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (Object.fromEntries(
            Object.entries(parsed as Edits).filter(
              ([, v]) => v && Array.isArray(v.ids) && v.ids.length > 0,
            ),
          ) as Edits)
        : {};
  } catch {
    cache = {};
  }
  return cache;
}

function write(next: Edits) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 사생활 보호 모드·용량 초과 — 화면 상태만 유지하고 넘어간다
  }
  listeners.forEach((fn) => fn());
}

const EMPTY: Edits = {};

export function useCourseEdits() {
  const edits = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      // 다른 탭에서 고쳤을 때도 따라간다
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
    () => EMPTY, // 서버에는 저장소가 없다 — 하이드레이션 후 실제 값으로 맞춰진다
  );

  const setIds = useCallback((courseId: string, ids: string[]) => {
    write({ ...read(), [courseId]: { ids, at: Date.now() } });
  }, []);

  /** 처음 추천대로 되돌리기 */
  const reset = useCallback((courseId: string) => {
    const now = { ...read() };
    delete now[courseId];
    write(now);
  }, []);

  return { edits, setIds, reset };
}

/**
 * 저장해 둔 순서를 지금 화면의 코스에 입힌다.
 *
 * id는 원래 코스의 경유지에서 먼저 찾고, 없으면 명소 목록(pool)에서 찾는다 —
 * 사용자가 나중에 더한 곳은 코스에 없기 때문이다. 둘 다에 없으면(KTO 목록에서
 * 빠진 명소) 그 한 곳만 조용히 건너뛴다. 남는 게 두 곳 미만이면 편집을 무시하고
 * 원래 코스를 보여준다 — 한 곳짜리 코스는 코스가 아니다.
 */
export function applyEdit<T extends Course>(
  course: T,
  edit: { ids: string[] } | undefined,
  pool: CourseStop[],
): T {
  if (!edit) return course;
  const byId = new Map<string, CourseStop>();
  for (const s of pool) byId.set(s.contentId, s);
  for (const s of course.stops) byId.set(s.contentId, s); // 코스 쪽이 우선

  const stops = edit.ids
    .map((id) => byId.get(id))
    .filter((s): s is CourseStop => !!s);
  if (stops.length < 2) return course;

  const same =
    stops.length === course.stops.length &&
    stops.every((s, i) => course.stops[i].contentId === s.contentId);
  return same ? course : rebuildCourse(course, stops);
}
