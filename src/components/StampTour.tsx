"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  Download,
  Loader2,
  MapPin,
  Stamp as StampIcon,
  X,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { renderCollageFromUrls } from "@/lib/collage";

/**
 * 도장투어 with 꿈돌이.
 *
 * 흐름: (아직 안 골랐다면) 위치 정보 동의 → 갈 곳 4곳 검색·선택 → 저장 →
 * 구불구불한 길 위 도장 4개. 도장을 누르면 GPS로 그 장소 근처인지 확인한
 * 뒤에만 사진을 올릴 수 있고, 올린 사진은 바로 아래 "꿈돌네컷" 미리보기의
 * 그 칸을 채운다. 4칸이 다 차면 다운로드할 수 있다.
 *
 * 이미 골라 둔 계정은 /api/stamp-tour가 바로 그 결과를 주므로 동의·선택
 * 단계를 건너뛰고 곧장 길 화면으로 간다.
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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 text-slate-500 transition hover:text-white"
        >
          <X size={16} />
        </button>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
          <MapPin size={22} />
        </span>
        <h2 className="mt-4 text-lg font-bold text-white">{t("title")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{t("body")}</p>
        {denied && <p className="mt-3 text-xs text-rose-400">{t("denied")}</p>}
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-white/15 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/30"
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
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<PickedPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searched, setSearched] = useState(false);
  const [chosen, setChosen] = useState<PickedPlace[]>([]);
  const placesRef = useRef<KakaoNS>(null);
  const kakaoRef = useRef<KakaoNS>(null);

  useEffect(() => {
    function init() {
      const { kakao } = window as KakaoNS;
      kakao.maps.load(() => {
        kakaoRef.current = kakao;
        placesRef.current = new kakao.maps.services.Places();
      });
    }
    if ((window as KakaoNS).kakao?.maps?.services) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
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
      className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/90 p-4 py-8 backdrop-blur-sm"
    >
      <div className="relative mx-auto w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-5 top-5 text-slate-500 transition hover:text-white"
        >
          <X size={16} />
        </button>

        <h2 className="pr-8 text-lg font-bold text-white">{t("title")}</h2>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-amber-300/80">
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
            className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-300/60"
          />
          <button
            type="submit"
            disabled={searching || !keyword.trim()}
            className="shrink-0 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {searching ? t("searching") : t("searchButton")}
          </button>
        </form>

        {searched && !searching && (
          <ul className="mt-3 max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-2">
            {searchError ? (
              <li className="px-2 py-3 text-center text-xs text-rose-400">{t("searchError")}</li>
            ) : results.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-slate-500">{t("searchEmpty")}</li>
            ) : (
              results.map((r, i) => (
                <li
                  key={`${r.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 transition hover:bg-white/5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-100">
                      {r.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{r.addr}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => addChosen(r)}
                    className="shrink-0 rounded-full border border-amber-300/40 px-3 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/10"
                  >
                    {t("select")}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-xs font-semibold text-slate-400">{t("selectedListTitle")}</p>
          {chosen.length === 0 ? (
            <p className="mt-2 text-xs text-slate-600">{t("selectedEmpty")}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {chosen.map((c, i) => (
                <li
                  key={`${c.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-amber-400/[0.06] px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm text-slate-100">
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

/** 구불구불한 길 위에 도장 4개 — 카드 배경은 홈 히어로와 같은 밤하늘 인상을 쓴다 */
function StampRoad({
  tour,
  onUpdate,
}: {
  tour: StampTourData;
  onUpdate: (t: StampTourData) => void;
}) {
  const t = useTranslations("stampTour.road");
  const [checkingSlot, setCheckingSlot] = useState<number | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleStampClick(slot: number) {
    const stop = tour.stops[slot];
    if (stop.photoUrl || checkingSlot !== null || uploadingSlot !== null) return;
    if (!("geolocation" in navigator)) {
      alert(t("gpsError"));
      return;
    }
    setCheckingSlot(slot);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCheckingSlot(null);
        const dist = haversineMeters(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          { lat: stop.lat, lng: stop.lng },
        );
        if (dist > STAMP_RADIUS_M) {
          alert(t("tooFar", { name: stop.name }));
          return;
        }
        fileInputRefs.current[slot]?.click();
      },
      () => {
        setCheckingSlot(null);
        alert(t("gpsError"));
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function handleFile(slot: number, file: File | null) {
    if (!file) return;
    setUploadingSlot(slot);
    try {
      const form = new FormData();
      form.append("slot", String(slot));
      form.append("photo", file);
      const res = await fetch("/api/stamp-tour/stamp", { method: "POST", body: form });
      if (res.status === 422) {
        alert(t("photoRejected"));
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      onUpdate(data.tour);
    } catch {
      alert(t("uploadError"));
    } finally {
      setUploadingSlot(null);
    }
  }

  // 4칸의 자리(0~100 기준 %) — 왼쪽·오른쪽을 번갈아 두어 구불구불한 인상을 준다.
  // 아래 path는 이 네 점을 곡선으로 잇는다. 하나를 옮기면 path도 함께 손봐야 한다
  const NODES = [
    { x: 20, y: 10 },
    { x: 78, y: 30 },
    { x: 18, y: 58 },
    { x: 74, y: 85 },
  ];
  const PATH = "M20,10 C55,6 85,16 78,30 C72,48 26,44 18,58 C12,72 56,78 74,85";

  return (
    <div className="relative mt-6 aspect-[3/4] w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 sm:aspect-[16/9]">
      {/* 홈 히어로와 같은 반짝이는 밤하늘 배경 */}
      <div className="night-hero pointer-events-none absolute inset-0" />

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="stampRoadGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <path
          d={PATH}
          fill="none"
          stroke="url(#stampRoadGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.85"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={PATH}
          fill="none"
          stroke="#fef3c7"
          strokeWidth="0.6"
          strokeDasharray="1.6 2.6"
          strokeLinecap="round"
          opacity="0.55"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {NODES.map((pos, i) => {
        const stop = tour.stops[i];
        const done = !!stop.photoUrl;
        const busy = checkingSlot === i || uploadingSlot === i;
        return (
          <div
            key={i}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <span className="max-w-[108px] truncate text-[11px] font-medium text-slate-400">
              {stop.name}
            </span>
            <button
              type="button"
              onClick={() => handleStampClick(i)}
              disabled={done || checkingSlot !== null || uploadingSlot !== null}
              aria-label={done ? t("stamped") : t("tapToStamp")}
              className={`relative flex h-16 w-16 items-center justify-center rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.55)] transition sm:h-[72px] sm:w-[72px] ${
                done
                  ? "border-2 border-amber-400 bg-slate-900"
                  : "border-2 border-dashed border-amber-400/50 bg-slate-900/70 hover:border-amber-400 disabled:cursor-not-allowed disabled:hover:border-amber-400/50"
              }`}
            >
              {done ? (
                <>
                  <Image
                    src={stop.photoUrl!}
                    alt=""
                    fill
                    sizes="72px"
                    className="rounded-full object-cover"
                  />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-950">
                    <Check size={12} strokeWidth={3} />
                  </span>
                </>
              ) : busy ? (
                <Loader2 size={20} className="animate-spin text-amber-300" />
              ) : (
                <StampIcon size={22} className="text-amber-400/80" />
              )}
            </button>
            {!done && (
              <span className="text-[10px] text-slate-500">
                {uploadingSlot === i ? t("uploading") : checkingSlot === i ? t("verifying") : t("tapToStamp")}
              </span>
            )}
            <input
              ref={(el) => {
                fileInputRefs.current[i] = el;
              }}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFile(i, e.target.files?.[0] ?? null)}
            />
          </div>
        );
      })}
    </div>
  );
}

/** 도장 사진으로 채워지는 꿈돌네컷 미리보기 + 다운로드 */
function CollageSection({ tour }: { tour: StampTourData }) {
  const t = useTranslations("stampTour.collage");
  const [preview, setPreview] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  const photoUrls = tour.stops.map((s) => s.photoUrl);

  // 도장을 찍을 때마다(사진이 바뀔 때마다) 미리보기를 다시 그린다
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- photoUrls는 매 렌더 새 배열이라 내용으로 비교한다
  }, [photoUrls.join("|")]);

  async function download() {
    if (!tour.complete) {
      alert(t("incomplete"));
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
      alert(t("downloadError"));
    } finally {
      setRendering(false);
    }
  }

  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center">
      <h3 className="text-base font-bold text-white">{t("title")}</h3>
      <p className="mt-1 text-xs text-slate-500">{t("hint")}</p>
      <div className="relative mx-auto mt-4 aspect-[788/1123] w-full max-w-[220px] overflow-hidden rounded-xl border border-white/10 bg-white shadow-lg">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element -- 로컬 object URL이라 next/image 로더가 다루지 못한다
          <img src={preview} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <button
        type="button"
        onClick={download}
        disabled={rendering}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download size={15} />
        {rendering ? t("downloading") : t("download")}
      </button>
    </div>
  );
}

export default function StampTour() {
  const t = useTranslations("stampTour");
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "consent" | "picker" | "main">("loading");
  const [tour, setTour] = useState<StampTourData | null>(null);
  const [consentDenied, setConsentDenied] = useState(false);
  const [consentChecking, setConsentChecking] = useState(false);

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
    try {
      const res = await fetch("/api/stamp-tour", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ places }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTour(data.tour);
      setPhase("main");
    } catch {
      alert(t("picker.saveError"));
    }
  }

  return (
    <>
      {phase === "loading" && (
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-2/3 rounded bg-white/5" />
          <div className="aspect-[3/4] w-full rounded-3xl bg-white/5 sm:aspect-[16/9]" />
        </div>
      )}

      {phase === "main" && tour && (
        <div>
          <h2 className="text-xl font-bold text-white sm:text-2xl">{t("mainTitle")}</h2>
          <StampRoad tour={tour} onUpdate={setTour} />
          <CollageSection tour={tour} />
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
        <PlacePickerModal onComplete={handlePickerComplete} onClose={() => router.push("/")} />
      )}
    </>
  );
}
