"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * 찜한 야경 명소 — 브라우저에만 저장한다.
 *
 * 서버에 두면 계정·동기화·삭제 정책이 따라붙는데, 지금 필요한 건 "이 카드
 * 눌러두고 목록에서 다시 찾기" 수준이라 localStorage로 충분하다.
 * 여러 컴포넌트가 같은 목록을 보므로 구독 가능한 스토어로 감싼다.
 */
const KEY = "tournight:bookmarks:v1";

const listeners = new Set<() => void>();
/** getSnapshot은 매번 같은 참조를 돌려줘야 해서(무한 렌더 방지) 캐시해 둔다 */
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: string[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 사생활 보호 모드 등 저장이 막힌 브라우저 — 화면 상태만 유지하고 넘어간다
  }
  listeners.forEach((fn) => fn());
}

const EMPTY: string[] = [];

export function useBookmarks() {
  const ids = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      // 다른 탭에서 찜했을 때도 따라가도록
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

  const toggle = useCallback((contentId: string) => {
    const now = read();
    write(
      now.includes(contentId)
        ? now.filter((id) => id !== contentId)
        : [...now, contentId],
    );
  }, []);

  return { ids, toggle };
}
