"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowRight, Check, Download, Loader2, MapPin, RotateCcw, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { renderCollageFromUrls } from "@/lib/collage";

/**
 * 도장투어 with 꿈돌이 → 꿈돌네컷.
 *
 * 흐름: (아직 안 골랐다면) 위치 정보 동의 → 갈 곳 4곳 검색·선택 → 저장 →
 * 민트 네온 도장 4개(지그재그 선으로 연결). 도장을 누르면 GPS로 그 장소
 * 근처인지 확인한 뒤에만 사진을 올릴 수 있고, 올린 사진은 우측 "꿈돌이와
 * 심야여행" 네컷 프레임의 그 칸을 채운다. 4칸이 다 차면 다운로드할 수 있다.
 *
 * 이미 골라 둔 계정은 /api/stamp-tour가 바로 그 결과를 주므로 동의·선택
 * 단계를 건너뛰고 곧장 도장 화면으로 간다.
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
const MINT = "#35b597";

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

/** 도장 4개(민트 네온) — 지그재그 선으로 연결, 배경 없이 */
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

  // 파일 선택창은 탭한 그 순간(동기적으로) 열어야 한다 — GPS 확인처럼 비동기
  // 콜백 안에서 뒤늦게 .click()을 부르면, 모바일 브라우저(특히 iOS/일부
  // 안드로이드)가 "사용자가 직접 누른 게 아니다"로 보고 조용히 막아버린다.
  // 그래서 사진 선택창은 즉시 열고, 위치 확인은 사진을 고른 "뒤"(handleFile)
  // 에서 한다. GPS가 안 맞으면 그때 업로드를 취소한다
  function handleStampClick(slot: number) {
    const stop = tour.stops[slot];
    if (stop.photoUrl || checkingSlot !== null || uploadingSlot !== null) return;
    fileInputRefs.current[slot]?.click();
  }

  async function handleFile(slot: number, file: File | null) {
    if (!file) return;
    const stop = tour.stops[slot];

    if (!("geolocation" in navigator)) {
      alert(t("gpsError"));
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
      alert(t("gpsError"));
      return;
    }
    const dist = haversineMeters(
      { lat: pos.coords.latitude, lng: pos.coords.longitude },
      { lat: stop.lat, lng: stop.lng },
    );
    if (dist > STAMP_RADIUS_M) {
      alert(t("tooFar", { name: stop.name }));
      return;
    }

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

  // 4칸의 자리(0~100 기준 %)와 그 사이를 잇는 지그재그 선
  const NODES = [
    { x: 20, y: 16 },
    { x: 78, y: 30 },
    { x: 18, y: 58 },
    { x: 74, y: 78 },
  ];
  const PATH = "M20,16 C55,12 85,20 78,30 C72,48 26,44 18,58 C12,70 56,74 74,78";

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="relative aspect-[3/4] w-full">
        {/* 도장을 잇는 선 — 굵고 옅은 층(후광) + 가늘고 밝은 층(중심선)을
            겹쳐 네온 느낌을 낸다. 전체가 함께 밝아졌다 옅어졌다 한다 */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="tn-mint-path pointer-events-none absolute inset-0 h-full w-full"
        >
          <path
            d={PATH}
            fill="none"
            stroke={MINT}
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.5"
            vectorEffect="non-scaling-stroke"
            style={{ filter: "blur(3px)" }}
          />
          <path
            d={PATH}
            fill="none"
            stroke={MINT}
            strokeWidth="1.6"
            strokeLinecap="round"
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
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <button
                type="button"
                onClick={() => handleStampClick(i)}
                disabled={done || checkingSlot !== null || uploadingSlot !== null}
                aria-label={done ? t("stamped") : t("tapToStamp")}
                className="tn-mint-stamp relative flex h-16 w-16 items-center justify-center rounded-full bg-white transition disabled:cursor-not-allowed sm:h-[72px] sm:w-[72px]"
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
                    <span
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: MINT }}
                    >
                      <Check size={12} strokeWidth={3} />
                    </span>
                  </>
                ) : busy ? (
                  <Loader2 size={20} className="animate-spin" style={{ color: MINT }} />
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
            </div>
          );
        })}
      </div>

      <style>{`
        /* 도장 — 테두리 없이 네온 후광만(밝기가 은은하게 오르내림) */
        .tn-mint-stamp {
          animation: tn-mint-glow 1.8s ease-in-out infinite;
        }
        @keyframes tn-mint-glow {
          0%, 100% { box-shadow: 0 0 6px rgba(53, 181, 151, 0.55), 0 0 16px rgba(53, 181, 151, 0.3); }
          50% { box-shadow: 0 0 14px rgba(53, 181, 151, 0.9), 0 0 32px rgba(53, 181, 151, 0.5); }
        }
        /* 도장을 잇는 선 — 같은 리듬으로 후광·중심선이 함께 밝아진다 */
        .tn-mint-path {
          animation: tn-mint-path-glow 1.8s ease-in-out infinite;
        }
        @keyframes tn-mint-path-glow {
          0%, 100% { opacity: 0.65; }
          50% { opacity: 1; }
        }
      `}</style>
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
            {/* 좌측 — 도장 4개 + 다운로드 버튼 */}
            <div>
              <StampRoad tour={tour} onUpdate={setTour} />
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={download}
                  disabled={rendering || !tour.complete}
                  className="inline-flex items-center gap-2 rounded-full border-2 px-6 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ borderColor: MINT, color: MINT }}
                >
                  <Download size={15} />
                  {rendering ? t("collage.downloading") : t("collage.download")}
                </button>
              </div>
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
    </>
  );
}
