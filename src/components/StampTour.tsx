"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowRight, Check, ChevronDown, Download, Heart, Loader2, MapPin, Plus, RotateCcw, Route, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { renderCollageFromUrls } from "@/lib/collage";
import { loadKakaoMaps } from "@/lib/kakaoMaps";
import { CHOSUNG_INDEX, indexChar } from "@/lib/hangul";
import type { NightSpot } from "@/lib/kto";
import { useBookmarks } from "./useBookmarks";
import { useSavedCourses } from "./useSavedCourses";

/**
 * 도장투어 with 꿈돌이 → 꿈돌네컷.
 *
 * 흐름: (아직 안 골랐다면) 위치 정보 동의 → 갈 곳 4곳 검색·선택 → 저장 →
 * 스팟 리스트 카드(순서대로 4곳). 지금 차례인 스팟만 누를 수 있고, GPS로
 * 그 장소 근처인지 확인한 뒤에만 사진을 올릴 수 있다. 올린 사진은 우측
 * "꿈돌이와 심야여행" 네컷 프레임의 그 칸을 채우고, 4칸이 다 차면
 * 카드 안의 버튼으로 완성한 네컷을 내려받을 수 있다.
 *
 * 이미 골라 둔 계정은 /api/stamp-tour가 바로 그 결과를 주므로 동의·선택
 * 단계를 건너뛰고 곧장 스팟 리스트로 간다.
 */

interface StampStop {
  name: string;
  lat: number;
  lng: number;
  photoUrl: string | null;
}
interface StampTourData {
  stops: StampStop[];
  complete: boolean;
}
interface PickedPlace {
  name: string;
  lat: number;
  lng: number;
  addr: string;
}

const DAEJEON_CENTER = { lat: 36.3504, lng: 127.3845 };
/** 이 반경(m) 안이면 "그 장소에 있다"고 본다 — 명소 하나가 꽤 넓을 수 있어 넉넉히 잡는다 */
const STAMP_RADIUS_M = 300;

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type KakaoNS = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** 위치 정보 동의 안내 팝업 — 이 페이지에 처음 온 사람에게만 뜬다 */
function ConsentModal({
  onAgree,
  onClose,
  denied,
  checking,
}: {
  onAgree: () => void;
  onClose: () => void;
  denied: boolean;
  checking: boolean;
}) {
  const t = useTranslations("stampTour.consent");
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-white/90 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 text-slate-500 transition hover:text-slate-900"
        >
          <X size={16} />
        </button>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <MapPin size={22} />
        </span>
        <h2 className="mt-4 text-lg font-bold text-slate-900">{t("title")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{t("body")}</p>
        {denied && <p className="mt-3 text-xs text-rose-400">{t("denied")}</p>}
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-slate-400 transition hover:border-white/30"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={onAgree}
            disabled={checking}
            className="flex-1 rounded-full bg-amber-400 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("agree")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** 갈 곳 4곳 검색·선택 팝업 — 카카오 장소 검색으로 대전 인근을 찾는다 */
function PlacePickerModal({
  onComplete,
  onClose,
}: {
  onComplete: (places: PickedPlace[]) => void;
  onClose: () => void;
}) {
  const t = useTranslations("stampTour.picker");
  const locale = useLocale();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<PickedPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searched, setSearched] = useState(false);
  const [chosen, setChosen] = useState<PickedPlace[]>([]);
  const placesRef = useRef<KakaoNS>(null);
  const kakaoRef = useRef<KakaoNS>(null);

  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps().then((kakao) => {
      if (cancelled) return;
      kakaoRef.current = kakao;
      placesRef.current = new kakao.maps.services.Places();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 검색만으로는 뭐가 있는지 둘러볼 수 없다는 피드백 — 검증된 야간 명소 전체를
  // 초성 색인으로 훑어볼 수 있게 아래에 덧붙인다. 명소 목록은 SavedSpots과
  // 같은 경량 API(/api/spots/list)를 쓴다
  const [allSpots, setAllSpots] = useState<NightSpot[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/spots/list?locale=${locale}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!cancelled) setAllSpots(d.spots ?? []);
      })
      .catch(() => {
        if (!cancelled) setAllSpots([]);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const { ids: bookmarkIds } = useBookmarks();
  const { courses: savedCourses } = useSavedCourses();
  const listRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /** 초성별 + "내가 찜한 장소" + "내가 만든 코스" 섹션. 마지막 두 개는 항상
   * 목록 끝(ㅎ 다음)에 둔다 — 비어 있어도 자리 자체는 유지해 위치가
   * 안정적이다(둘러보다 보면 그 자리로 손이 기억한다) */
  const sections = useMemo(() => {
    const spots = allSpots ?? [];
    const byId = new Map(spots.map((s) => [s.contentId, s]));

    const groups = new Map<string, NightSpot[]>();
    for (const s of spots) {
      const key = indexChar(s.title) ?? "#";
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(s);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => a.title.localeCompare(b.title, "ko"));
    }

    const alpha: { key: string; label: string; items: NightSpot[] }[] = CHOSUNG_INDEX.filter(
      (k) => groups.has(k),
    ).map((k) => ({ key: k, label: k, items: groups.get(k)! }));
    const other = groups.get("#");
    if (other?.length) alpha.push({ key: "#", label: t("sectionOther"), items: other });

    const bookmarked = bookmarkIds
      .map((id) => byId.get(id))
      .filter((s): s is NightSpot => !!s);

    const courseStopIds = Array.from(
      new Set(savedCourses.flatMap((c) => c.stops.map((s) => s.contentId))),
    );
    const fromCourses = courseStopIds
      .map((id) => byId.get(id))
      .filter((s): s is NightSpot => !!s);

    return [
      ...alpha,
      { key: "bookmarks", label: t("sectionBookmarks"), items: bookmarked },
      { key: "courses", label: t("sectionCourses"), items: fromCourses },
    ];
  }, [allSpots, bookmarkIds, savedCourses, t]);

  function jumpTo(key: string) {
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    const q = keyword.trim();
    if (!q || !placesRef.current) return;
    setSearching(true);
    setSearchError(false);
    setSearched(true);
    const kakao = kakaoRef.current;
    placesRef.current.keywordSearch(
      q,
      (data: KakaoNS[], status: string) => {
        setSearching(false);
        if (status === kakao.maps.services.Status.OK) {
          setResults(
            data.slice(0, 8).map((d) => ({
              name: d.place_name,
              addr: d.road_address_name || d.address_name,
              lat: Number(d.y),
              lng: Number(d.x),
            })),
          );
        } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
          setResults([]);
        } else {
          setResults([]);
          setSearchError(true);
        }
      },
      {
        location: new kakao.maps.LatLng(DAEJEON_CENTER.lat, DAEJEON_CENTER.lng),
        radius: 20000,
      },
    );
  }

  function addChosen(place: PickedPlace) {
    if (chosen.length >= 4) {
      alert(t("alreadyFour"));
      return;
    }
    if (chosen.some((c) => c.name === place.name && c.lat === place.lat && c.lng === place.lng)) {
      alert(t("alreadyPicked"));
      return;
    }
    setChosen((prev) => [...prev, place]);
  }

  function removeChosen(i: number) {
    setChosen((prev) => prev.filter((_, idx) => idx !== i));
  }

  function complete() {
    if (chosen.length !== 4) {
      alert(t("needFour"));
      return;
    }
    onComplete(chosen);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-[70] overflow-y-auto bg-white/90 p-4 py-8 backdrop-blur-sm"
    >
      <div className="relative mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-5 top-5 text-slate-500 transition hover:text-slate-900"
        >
          <X size={16} />
        </button>

        <h2 className="pr-8 text-lg font-bold text-slate-900">{t("title")}</h2>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-amber-600/80">
            {t("selectedCount", { count: chosen.length })}
          </p>
          <button
            type="button"
            onClick={complete}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.4)] transition hover:bg-amber-300"
          >
            {t("complete")}
            <ArrowRight size={15} />
          </button>
        </div>

        <form onSubmit={search} className="mt-4 flex gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-950/60 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-300/60"
          />
          <button
            type="submit"
            disabled={searching || !keyword.trim()}
            className="shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {searching ? t("searching") : t("searchButton")}
          </button>
        </form>

        {searched && !searching && (
          <ul className="mt-3 max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-white/[0.02] p-2">
            {searchError ? (
              <li className="px-2 py-3 text-center text-xs text-rose-400">{t("searchError")}</li>
            ) : results.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-slate-500">{t("searchEmpty")}</li>
            ) : (
              results.map((r, i) => (
                <li
                  key={`${r.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 transition hover:bg-slate-100"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {r.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{r.addr}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => addChosen(r)}
                    className="shrink-0 rounded-full border border-amber-300/40 px-3 py-1 text-xs font-semibold text-amber-600 transition hover:bg-amber-50"
                  >
                    {t("select")}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        {/* 검색만으로는 뭐가 있는지 훑어볼 수 없다는 피드백 — 검증된 야간
            명소 전체를 초성 색인으로 둘러볼 수 있게 덧붙인다. 왼쪽 글자를
            누르면 오른쪽 목록이 그 칸으로 스크롤된다 */}
        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold text-slate-400">{t("browseTitle")}</p>
          {allSpots === null ? (
            <p className="mt-3 text-xs text-slate-400">{t("browseLoading")}</p>
          ) : (
            <div className="mt-2 flex gap-2">
              <div className="flex shrink-0 flex-col items-center gap-0.5">
                {sections.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => jumpTo(s.key)}
                    title={s.label}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                  >
                    {s.key === "bookmarks" ? (
                      <Heart size={12} />
                    ) : s.key === "courses" ? (
                      <Route size={12} />
                    ) : (
                      s.label
                    )}
                  </button>
                ))}
              </div>
              <div
                ref={listRef}
                className="max-h-64 min-w-0 flex-1 overflow-y-auto rounded-xl border border-slate-200"
              >
                {sections.map((s) => (
                  <div
                    key={s.key}
                    ref={(el) => {
                      sectionRefs.current[s.key] = el;
                    }}
                  >
                    <p className="sticky top-0 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                      {s.label}
                    </p>
                    {s.items.length === 0 ? (
                      <p className="px-3 py-2.5 text-xs text-slate-400">
                        {s.key === "bookmarks"
                          ? t("sectionBookmarksEmpty")
                          : s.key === "courses"
                            ? t("sectionCoursesEmpty")
                            : t("searchEmpty")}
                      </p>
                    ) : (
                      <ul>
                        {s.items.map((sp) => (
                          <li key={`${s.key}-${sp.contentId}`}>
                            <button
                              type="button"
                              onClick={() =>
                                addChosen({ name: sp.title, lat: sp.mapY, lng: sp.mapX, addr: sp.addr })
                              }
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-amber-50"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-slate-900">
                                  {sp.title}
                                </span>
                                <span className="block truncate text-xs text-slate-500">{sp.addr}</span>
                              </span>
                              <Plus size={14} className="shrink-0 text-amber-600" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold text-slate-400">{t("selectedListTitle")}</p>
          {chosen.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">{t("selectedEmpty")}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {chosen.map((c, i) => (
                <li
                  key={`${c.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm text-slate-900">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-slate-950">
                      {i + 1}
                    </span>
                    <span className="truncate">{c.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeChosen(i)}
                    aria-label={t("remove")}
                    className="shrink-0 text-slate-500 transition hover:text-rose-400"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** 스팟 하나만 다른 장소로 바꾸는 검색 팝업 — 이미 고른 나머지와 겹치지 않게 막는다 */
function SinglePlacePickerModal({
  excludePlaces,
  onComplete,
  onClose,
}: {
  excludePlaces: { name: string; lat: number; lng: number }[];
  onComplete: (place: PickedPlace) => void;
  onClose: () => void;
}) {
  const t = useTranslations("stampTour.picker");
  const tList = useTranslations("stampTour.list");
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<PickedPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searched, setSearched] = useState(false);
  const placesRef = useRef<KakaoNS>(null);
  const kakaoRef = useRef<KakaoNS>(null);

  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps().then((kakao) => {
      if (cancelled) return;
      kakaoRef.current = kakao;
      placesRef.current = new kakao.maps.services.Places();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const q = keyword.trim();
    if (!q || !placesRef.current) return;
    setSearching(true);
    setSearchError(false);
    setSearched(true);
    const kakao = kakaoRef.current;
    placesRef.current.keywordSearch(
      q,
      (data: KakaoNS[], status: string) => {
        setSearching(false);
        if (status === kakao.maps.services.Status.OK) {
          setResults(
            data.slice(0, 8).map((d) => ({
              name: d.place_name,
              addr: d.road_address_name || d.address_name,
              lat: Number(d.y),
              lng: Number(d.x),
            })),
          );
        } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
          setResults([]);
        } else {
          setResults([]);
          setSearchError(true);
        }
      },
      {
        location: new kakao.maps.LatLng(DAEJEON_CENTER.lat, DAEJEON_CENTER.lng),
        radius: 20000,
      },
    );
  }

  function pick(place: PickedPlace) {
    if (
      excludePlaces.some((c) => c.name === place.name && c.lat === place.lat && c.lng === place.lng)
    ) {
      alert(t("alreadyPicked"));
      return;
    }
    onComplete(place);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tList("reselectTitle")}
      className="fixed inset-0 z-[70] overflow-y-auto bg-white/90 p-4 py-8 backdrop-blur-sm"
    >
      <div className="relative mx-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-5 top-5 text-slate-500 transition hover:text-slate-900"
        >
          <X size={16} />
        </button>

        <h2 className="pr-8 text-lg font-bold text-slate-900">{tList("reselectTitle")}</h2>

        <form onSubmit={search} className="mt-4 flex gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-950/60 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-300/60"
          />
          <button
            type="submit"
            disabled={searching || !keyword.trim()}
            className="shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {searching ? t("searching") : t("searchButton")}
          </button>
        </form>

        {searched && !searching && (
          <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-white/[0.02] p-2">
            {searchError ? (
              <li className="px-2 py-3 text-center text-xs text-rose-400">{t("searchError")}</li>
            ) : results.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-slate-500">{t("searchEmpty")}</li>
            ) : (
              results.map((r, i) => (
                <li
                  key={`${r.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 transition hover:bg-slate-100"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {r.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{r.addr}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    className="shrink-0 rounded-full border border-amber-300/40 px-3 py-1 text-xs font-semibold text-amber-600 transition hover:bg-amber-50"
                  >
                    {t("select")}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** 스팟 4곳을 순서대로 담는 리스트 카드 — 지금 차례인 스팟만 누를 수 있다 */
function StampList({
  tour,
  onUpdate,
  onComplete,
  completing,
}: {
  tour: StampTourData;
  onUpdate: (t: StampTourData) => void;
  onComplete: () => void;
  completing: boolean;
}) {
  const t = useTranslations("stampTour");
  const tList = useTranslations("stampTour.list");
  const tRoad = useTranslations("stampTour.road");
  const [checkingSlot, setCheckingSlot] = useState<number | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [reselectSlot, setReselectSlot] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const doneCount = tour.stops.filter((s) => !!s.photoUrl).length;
  // 아직 못 찍은 것 중 가장 앞 순서 — "순서대로" 담으므로 그 자리만 지금 누를 수 있다
  const nextIndex = tour.stops.findIndex((s) => !s.photoUrl);

  // 파일 선택창은 탭한 그 순간(동기적으로) 열어야 한다 — GPS 확인처럼 비동기
  // 콜백 안에서 뒤늦게 .click()을 부르면, 모바일 브라우저(특히 iOS/일부
  // 안드로이드)가 "사용자가 직접 누른 게 아니다"로 보고 조용히 막아버린다.
  // 그래서 사진 선택창은 즉시 열고, 위치 확인은 사진을 고른 "뒤"(handleFile)
  // 에서 한다. GPS가 안 맞으면 그때 업로드를 취소한다
  function handleSpotClick(slot: number) {
    if (slot !== nextIndex || checkingSlot !== null || uploadingSlot !== null) return;
    fileInputRefs.current[slot]?.click();
  }

  async function handleFile(slot: number, file: File | null) {
    if (!file) return;
    const stop = tour.stops[slot];

    if (!("geolocation" in navigator)) {
      alert(tRoad("gpsError"));
      return;
    }
    setCheckingSlot(slot);
    const pos = await new Promise<GeolocationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(p),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 12000 },
      );
    });
    setCheckingSlot(null);
    if (!pos) {
      alert(tRoad("gpsError"));
      return;
    }
    const dist = haversineMeters(
      { lat: pos.coords.latitude, lng: pos.coords.longitude },
      { lat: stop.lat, lng: stop.lng },
    );
    if (dist > STAMP_RADIUS_M) {
      alert(tRoad("tooFar", { name: stop.name }));
      return;
    }

    setUploadingSlot(slot);
    try {
      const form = new FormData();
      form.append("slot", String(slot));
      form.append("photo", file);
      const res = await fetch("/api/stamp-tour/stamp", { method: "POST", body: form });
      if (res.status === 422) {
        alert(tRoad("photoRejected"));
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      onUpdate(data.tour);
    } catch {
      alert(tRoad("uploadError"));
    } finally {
      setUploadingSlot(null);
    }
  }

  async function handleReselect(slot: number, place: PickedPlace) {
    try {
      const res = await fetch("/api/stamp-tour", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slot,
          place: { name: place.name, lat: place.lat, lng: place.lng },
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onUpdate(data.tour);
      setReselectSlot(null);
    } catch {
      alert(tList("reselectSaveError"));
    }
  }

  return (
    <div className="mx-auto w-full max-w-[31.2rem] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">{tList("title")}</h3>
          <p className="mt-1 text-sm text-slate-500">{tList("subtitle")}</p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-daejeon-green">
          {tList("progress", { done: doneCount })}
        </span>
      </div>

      <ul className="mt-5 space-y-3">
        {tour.stops.map((stop, i) => {
          const done = !!stop.photoUrl;
          const isNext = i === nextIndex;
          const busy = checkingSlot === i || uploadingSlot === i;
          const status = done
            ? tList("statusDone")
            : isNext
              ? tList("statusCurrent")
              : tList("statusLocked");

          return (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
                isNext ? "bg-daejeon-orange/10 ring-1 ring-daejeon-orange/30" : "bg-slate-50"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  done
                    ? "bg-daejeon-green text-white"
                    : isNext
                      ? "bg-daejeon-orange text-white"
                      : "bg-slate-200 text-slate-400"
                }`}
              >
                {done ? <Check size={16} strokeWidth={3} /> : isNext ? <MapPin size={16} /> : i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">{stop.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <p className="truncate text-xs text-slate-500">{status}</p>
                  {!done && (
                    <button
                      type="button"
                      onClick={() => setReselectSlot(i)}
                      className="shrink-0 text-xs font-semibold text-daejeon-orange transition hover:underline"
                    >
                      {tList("reselectSpot")}
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSpotClick(i)}
                disabled={!isNext || busy}
                aria-label={status}
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white transition ${
                  isNext ? "ring-2 ring-daejeon-orange" : "ring-1 ring-slate-200"
                } disabled:cursor-not-allowed`}
              >
                {done ? (
                  <Image src={stop.photoUrl!} alt="" fill sizes="44px" className="object-cover" />
                ) : busy ? (
                  <Loader2 size={16} className="animate-spin text-daejeon-orange" />
                ) : isNext ? (
                  <MapPin size={16} className="text-daejeon-orange" />
                ) : null}
              </button>

              <input
                ref={(el) => {
                  fileInputRefs.current[i] = el;
                }}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  // 같은 파일을 다시 골라도(예: GPS가 안 맞아 취소된 뒤 재시도)
                  // change 이벤트가 다시 뜨도록 값을 비워 둔다
                  e.target.value = "";
                  handleFile(i, file);
                }}
              />
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onComplete}
        disabled={completing || !tour.complete}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-daejeon-orange py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Download size={15} />
        {completing ? t("collage.downloading") : tList("completeButton")}
      </button>
      <div className="mt-2 flex justify-center lg:hidden">
        <ChevronDown size={18} className="text-slate-300" />
      </div>

      {reselectSlot !== null && (
        <SinglePlacePickerModal
          excludePlaces={tour.stops
            .filter((_, idx) => idx !== reselectSlot)
            .map((s) => ({ name: s.name, lat: s.lat, lng: s.lng }))}
          onComplete={(place) => handleReselect(reselectSlot, place)}
          onClose={() => setReselectSlot(null)}
        />
      )}
    </div>
  );
}

export default function StampTour() {
  const t = useTranslations("stampTour");
  const tList = useTranslations("stampTour.list");
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "consent" | "picker" | "main">("loading");
  const [tour, setTour] = useState<StampTourData | null>(null);
  const [consentDenied, setConsentDenied] = useState(false);
  const [consentChecking, setConsentChecking] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    fetch("/api/stamp-tour")
      .then((res) => (res.ok ? res.json() : { tour: null }))
      .then((data) => {
        if (data.tour) {
          setTour(data.tour);
          setPhase("main");
        } else {
          setPhase("consent");
        }
      })
      .catch(() => setPhase("consent"));
  }, []);

  const photoUrls: (string | null)[] = tour
    ? tour.stops.map((s) => s.photoUrl)
    : [null, null, null, null];
  const photoKey = photoUrls.join("|");

  // 도장을 찍을 때마다(사진이 바뀔 때마다) 네컷 미리보기를 다시 그린다
  useEffect(() => {
    if (!tour) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    renderCollageFromUrls(photoUrls)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- photoUrls는 매 렌더 새 배열이라 photoKey(내용)로 비교한다
  }, [tour, photoKey]);

  function handleAgree() {
    if (!("geolocation" in navigator)) {
      setConsentDenied(true);
      return;
    }
    setConsentChecking(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setConsentChecking(false);
        setConsentDenied(false);
        setPhase("picker");
      },
      () => {
        setConsentChecking(false);
        setConsentDenied(true);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function handlePickerComplete(places: PickedPlace[]) {
    // 이미 tour가 있는 상태에서 다시 이 화면으로 왔다면 "관광지 다시 선택하기"
    // 흐름이다 — 서버에 reset을 같이 보내 기존 4곳(과 찍었던 사진)을 지우고
    // 새로 고른 4곳으로 덮어쓰게 한다
    const reset = tour !== null;
    try {
      const res = await fetch("/api/stamp-tour", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ places, reset }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTour(data.tour);
      setPhase("main");
    } catch {
      alert(t("picker.saveError"));
    }
  }

  async function download() {
    if (!tour?.complete) {
      alert(t("collage.incomplete"));
      return;
    }
    setRendering(true);
    try {
      const blob = await renderCollageFromUrls(photoUrls);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "꿈돌네컷.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert(t("collage.downloadError"));
    } finally {
      setRendering(false);
    }
  }

  return (
    <>
      {phase === "loading" && (
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div className="mx-auto aspect-[3/4] w-full max-w-sm animate-pulse rounded-2xl bg-slate-100" />
          <div className="mx-auto aspect-[788/1123] w-full max-w-md animate-pulse rounded-2xl bg-slate-100" />
        </div>
      )}

      {phase === "main" && tour && (
        <div>
          <button
            type="button"
            onClick={() => setPhase("picker")}
            className="mx-auto flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-slate-50 lg:mx-0"
          >
            <RotateCcw size={15} />
            {t("reselect")}
          </button>

          <div className="mt-6 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            {/* 좌측 — 안내 문구 + 스팟 4곳을 순서대로 담는 리스트 카드(다운로드
                버튼 포함). 카드를 화면 아래쪽으로 살짝 내리고, 그 위에 민트색
                네온사인 안내 문구를 둔다 — 문구는 카드(원래 너비의 1.3배)와 같은
                너비로 가운데 맞춰 카드의 x축 중앙에 오도록 하고, 문구 자체도
                가운데 정렬한다. 문구만 30px 위로 올리되, 그만큼을 margin-bottom
                으로 보충해 바로 아래 카드는 원래 자리 그대로 있게 한다 */}
            <div className="lg:mt-10">
              <p className="tn-notice-neon mx-auto mt-[-30px] mb-[calc(1rem+30px)] w-full max-w-[31.2rem] whitespace-pre-line text-center text-sm font-light leading-relaxed text-daejeon-green">
                {tList("notice")}
              </p>
              <StampList
                tour={tour}
                onUpdate={setTour}
                onComplete={download}
                completing={rendering}
              />
            </div>

            {/* 우측 — 큰 네컷 프레임(미리보기 전용) */}
            <div className="relative mx-auto aspect-[788/1123] w-full max-w-md">
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element -- 로컬 object URL이라 next/image 로더가 다루지 못한다
                <img src={preview} alt="" className="h-full w-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}

      {phase === "consent" && (
        <ConsentModal
          onAgree={handleAgree}
          onClose={() => router.push("/")}
          denied={consentDenied}
          checking={consentChecking}
        />
      )}
      {phase === "picker" && (
        <PlacePickerModal
          onComplete={handlePickerComplete}
          // 이미 골라 둔 게 있으면 "다시 선택하기"에서 들어온 것 — 닫으면 원래
          // 보던 도장 화면으로 돌아간다. 처음 고르는 중이면 여전히 홈으로 나간다
          onClose={() => (tour ? setPhase("main") : router.push("/"))}
        />
      )}

      <style>{`
        .tn-notice-neon {
          animation: tn-notice-neon-glow 2s ease-in-out infinite;
        }
        @keyframes tn-notice-neon-glow {
          0%, 100% { text-shadow: 0 0 4px rgba(53, 181, 151, 0.5), 0 0 10px rgba(53, 181, 151, 0.25); }
          50% { text-shadow: 0 0 10px rgba(53, 181, 151, 0.9), 0 0 22px rgba(53, 181, 151, 0.55); }
        }
      `}</style>
    </>
  );
}
