"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, ExternalLink, MapPin, RefreshCw, Route } from "lucide-react";
import Image from "next/image";
import { TASHU_COURSES, distanceM, type BikeLocale } from "@/lib/tashu-courses";

const DAEJEON_CENTER = { lat: 36.3504, lng: 127.3845 };

/* eslint-disable @typescript-eslint/no-explicit-any */
type KakaoNS = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface TashuStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  parkingCount: number;
}

/** 오버레이는 문자열 HTML로 만들어지므로 대여소 이름은 이스케이프해서 넣는다 */
function esc(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** 지도 아래 안내 문구에서 노란색으로 강조할 단어 — 언어마다 실제 단어가 다르다 */
const PROMO_HIGHLIGHTS: Record<string, string[]> = {
  ko: ["타슈", "무료", "한 시간", "무제한"],
  en: ["Tashu", "free", "one hour", "unlimited"],
  ja: ["タシュ", "無料", "1時間", "無制限"],
  zh: ["Tashu", "免费", "1小时", "不限"],
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 문장 하나에서 강조 단어만 노란 글자로 바꿔 조각내 돌려준다 */
function highlightWords(text: string, words: string[]) {
  if (words.length === 0) return [text];
  const pattern = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "g");
  return text.split(pattern).map((part, i) =>
    words.includes(part) ? (
      <span key={i} className="font-semibold text-amber-600">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** 대수를 숫자 배지 핀으로 — 0대는 회색, 1대 이상은 앰버로 한눈에 구분한다 */
function pinSvg(count: number): string {
  const color = count > 0 ? "#fbbf24" : "#64748b";
  const label = count > 99 ? "99+" : String(count);
  const fontSize = label.length > 2 ? 10 : 12;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="${color}"/><text x="14" y="18.5" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#0f172a" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * 대전 타슈 실시간 대여소 지도 — 심야 무료 자전거 여행.
 *
 * /api/tashu/stations(서버가 타슈 오픈API를 대신 불러 정제한 결과)를 받아
 * 카카오맵 위에 대여소마다 배지 핀을 찍는다. 대여 가능 대수가 0인 곳도
 * 그대로 회색 핀으로 보여준다(걸러내지 않음) — "0개인 곳도 포함" 요청.
 *
 * 대여소가 1,300여 곳이라 마커를 하나씩 다 그리면 확대해도 화면이 빽빽해서,
 * MarkerClusterer로 멀리서는 뭉쳐 보이고 가까이 확대하면 각 대여소 배지가
 * 드러나게 한다. 배지 이미지는 대수(정수)별로만 한 번씩 만들어 재사용한다
 * — 1,300개 각각 SVG를 새로 만들면 낭비다.
 */
export default function NightBikeMap() {
  const t = useTranslations("nightBike");
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoNS>(null);
  const clustererRef = useRef<KakaoNS>(null);
  const [stations, setStations] = useState<TashuStation[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // setState 없는 순수 fetch — 마운트 시 자동 조회와 새로고침 버튼이 나눠 쓴다.
  // 마운트 쪽 effect 본문에서 setState를 동기로 바로 부르면 안 된다는 lint
  // 규칙(react-hooks/set-state-in-effect) 때문에 fetch 자체와 상태 갱신을 분리했다
  async function fetchStations(): Promise<TashuStation[]> {
    const res = await fetch("/api/tashu/stations");
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.stations;
  }

  // 현위치는 한 번만 잡는다 — stations 갱신 때마다 다시 묻지 않게
  const geoDoneRef = useRef(false);
  const [copied, setCopied] = useState(false);
  // 현위치 — 잡히면 추천 코스를 가까운 순으로 다시 세운다 (피드백: 자전거 코스)
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const bikeLocale = (["ko", "en", "ja", "zh"].includes(locale) ? locale : "en") as BikeLocale;
  const orderedCourses = useMemo(
    () =>
      userPos
        ? [...TASHU_COURSES].sort(
            (a, b) => distanceM(userPos, a.start) - distanceM(userPos, b.start),
          )
        : TASHU_COURSES,
    [userPos],
  );

  /** 브라우저 위치를 받아 지도를 현위치로 옮기고 빨간 점 + '현위치' 라벨을 찍는다
      (피드백 11). 대전 밖(아직 여행 전)이면 기본 대전 전경을 유지한다. */
  function locateUser(kakao: KakaoNS["kakao"]) {
    if (geoDoneRef.current || !navigator.geolocation) return;
    geoDoneRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        const inDaejeon = lat > 36.1 && lat < 36.62 && lng > 127.18 && lng < 127.72;
        const map = mapRef.current;
        if (!map) return;
        const here = new kakao.maps.LatLng(lat, lng);
        new kakao.maps.CustomOverlay({
          position: here,
          yAnchor: 1,
          content:
            '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;">' +
            `<span style="background:#fff;border:1px solid #e2e8f0;border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:700;color:#dc2626;box-shadow:0 2px 8px rgba(15,23,42,.15);">${t("myLocation")}</span>` +
            '<span style="width:14px;height:14px;border-radius:9999px;background:#dc2626;border:3px solid #fff;box-shadow:0 0 0 2px rgba(220,38,38,.35),0 2px 6px rgba(15,23,42,.3);"></span>' +
            "</div>",
          map,
        });
        if (inDaejeon) {
          map.setCenter(here);
          map.setLevel(5);
        }
      },
      () => {}, // 거부·실패 시 조용히 기본 화면 유지
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function refresh() {
    setLoading(true);
    setError(false);
    fetchStations()
      .then((next) => {
        setStations(next);
        setUpdatedAt(new Date());
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchStations()
      .then((next) => {
        setStations(next);
        setUpdatedAt(new Date());
      })
      .catch(() => setError(true));
  }, []);

  // 지도·마커는 stations가 새로 올 때마다(새로고침 포함) 다시 그린다.
  // 지도 자체(kakao.maps.Map)는 한 번만 만들고, 클러스터러만 매번 갈아 끼운다 —
  // 지도를 새로 만들면 사용자가 옮겨 둔 확대/이동 위치가 매번 리셋된다
  useEffect(() => {
    if (!stations) return;
    const container = containerRef.current;
    if (!container) return;

    const draw = () => {
      const { kakao } = window as KakaoNS;
      kakao.maps.load(() => {
        if (!mapRef.current) {
          mapRef.current = new kakao.maps.Map(container, {
            center: new kakao.maps.LatLng(DAEJEON_CENTER.lat, DAEJEON_CENTER.lng),
            // 처음부터 너무 멀리서 보면(레벨 6+) 클러스터러 기본 뭉치 아이콘만 잔뜩
            // 보여서 "대여소마다 몇 대인지" 요청과 어긋난다 — 조금 당겨서 시작해
            // 대부분의 개별 배지가 바로 보이게 하고, 사용자가 직접 축소할 때만 뭉친다
            level: 4,
          });
          locateUser(kakao);
          mapRef.current.addControl(
            new kakao.maps.ZoomControl(),
            kakao.maps.ControlPosition.RIGHT,
          );
        }
        const map = mapRef.current;

        clustererRef.current?.clear();

        const imageCache = new Map<number, KakaoNS>();
        const getImage = (count: number) => {
          if (!imageCache.has(count)) {
            imageCache.set(
              count,
              new kakao.maps.MarkerImage(pinSvg(count), new kakao.maps.Size(28, 28), {
                offset: new kakao.maps.Point(14, 14),
              }),
            );
          }
          return imageCache.get(count);
        };

        const infoWindow = new kakao.maps.InfoWindow({ removable: true });
        const markers = stations.map((s) => {
          const marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(s.lat, s.lng),
            image: getImage(s.parkingCount),
            title: `${s.name} (${s.parkingCount})`,
          });
          kakao.maps.event.addListener(marker, "click", () => {
            infoWindow.setContent(
              `<div style="padding:7px 11px;font-size:12px;line-height:1.5;white-space:nowrap">
                 <b>${esc(s.name)}</b><br/>
                 ${t("available", { count: s.parkingCount })}
               </div>`,
            );
            infoWindow.open(map, marker);
          });
          return marker;
        });

        if (!clustererRef.current) {
          clustererRef.current = new kakao.maps.MarkerClusterer({
            map,
            averageCenter: true,
            // 기본(4) 근처에서는 뭉치지 않고 개별 배지가 보이게, 시 전체를 보듯
            // 멀리 축소했을 때만(7+) 클러스터러가 묶는다
            minLevel: 7,
            gridSize: 70,
          });
        }
        clustererRef.current.addMarkers(markers);
      });
    };

    if ((window as KakaoNS).kakao?.maps?.MarkerClusterer) {
      draw();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY}&autoload=false&libraries=clusterer`;
    script.async = true;
    script.onload = draw;
    document.head.appendChild(script);
  }, [stations, t]);

  return (
    <div>
      {/* 타슈 앱 안내 — 위 히어로 배너("NIGHT BIKE" 박스) 바로 밑에, 8px 정도
          여백만 두고 온다. PageBody 자체에 이미 pt-8(2rem) 위 여백이 있어서,
          그만큼을 음수 마진으로 상쇄한 뒤 8px만 남긴다 — calc라 루트 글자
          크기(1.2배)가 바뀌어도 항상 "2rem을 상쇄하고 8px만" 유지된다.
          가로·텍스트 모두 가운데 정렬 */}
      <div className="mx-auto w-full rounded-2xl border border-slate-200 bg-slate-100 p-5 text-center sm:w-1/2 [margin-top:calc(8px-2rem)]">
        <div className="space-y-1.5 text-sm leading-relaxed text-slate-400">
          {t("promoText")
            .split("\n")
            .map((line, i) => (
              <p key={i}>{highlightWords(line, PROMO_HIGHLIGHTS[locale] ?? PROMO_HIGHLIGHTS.ko)}</p>
            ))}
        </div>
        {/* 앱 연동 — 안드로이드는 플레이스토어 검색으로 바로, 아이폰은 App Store에서
            '타슈'를 검색하도록 안내하고 이름을 한 번에 복사할 수 있게 한다 (피드백 11) */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <a
            href="https://play.google.com/store/search?q=%ED%83%80%EC%8A%88&c=apps"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
          >
            <ExternalLink size={13} />
            Google Play
          </a>
          <button
            type="button"
            onClick={() => {
              try {
                navigator.clipboard.writeText("타슈");
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              } catch {}
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-daejeon-blue hover:text-daejeon-blue"
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            {copied ? t("copied") : t("copyName")}
          </button>
        </div>
        <p className="mt-2.5 text-xs text-slate-400">{t("appStoreHint")}</p>
      </div>

      {/* ── 추천 타슈 코스 — 대여소 밀집 지점과 야간 명소를 조합해 미리 설계.
          현위치가 잡히면 가장 가까운 코스가 맨 앞으로 오고 네온 테두리로 빛난다 ── */}
      <section className="mt-10">
        <div className="mb-5 text-center">
          <p className="text-sm font-semibold text-slate-500">{t("coursesSub")}</p>
          <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-daejeon-green sm:text-3xl">
            {t("coursesTitle")}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {orderedCourses.map((c, i) => {
            const nearest = i === 0 && !!userPos;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  const { kakao } = window as KakaoNS;
                  const map = mapRef.current;
                  if (kakao?.maps && map) {
                    map.setCenter(new kakao.maps.LatLng(c.start.lat, c.start.lng));
                    map.setLevel(5);
                    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
                className={`group relative overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                  nearest ? "tn-neon border-emerald-400" : "border-slate-200"
                }`}
              >
                {nearest && (
                  <span className="absolute inset-x-0 top-0 z-10 bg-emerald-500 py-1 text-center text-[11px] font-extrabold text-white">
                    {t("nearestBadge")}
                  </span>
                )}
                <div className={`relative h-28 w-full overflow-hidden bg-slate-200 ${nearest ? "mt-6" : ""}`}>
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="(min-width:1024px) 25vw, 50vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-[15px] font-bold text-slate-900">{c.name[bikeLocale]}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-daejeon-green">
                    <Route size={12} />
                    {t("courseMeta", { km: c.distanceKm, min: c.durationMin })}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {c.desc[bikeLocale]}
                  </p>
                  <p className="mt-2 flex items-start gap-1 text-[11px] leading-snug text-slate-400">
                    <MapPin size={11} className="mt-0.5 shrink-0 text-daejeon-orange" />
                    {t("courseStart", { name: c.startName[bikeLocale] })} ·{" "}
                    {c.stops.map((st) => st[bikeLocale]).join(" → ")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <style>{`
          .tn-neon { animation: tn-neon 1.8s ease-in-out infinite; }
          @keyframes tn-neon {
            0%, 100% { box-shadow: 0 0 6px rgba(16,185,129,.55), 0 0 18px rgba(16,185,129,.3); }
            50% { box-shadow: 0 0 14px rgba(16,185,129,.85), 0 0 34px rgba(16,185,129,.45); }
          }
        `}</style>
      </section>

      <div className="mb-3 mt-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden />
            {t("legendAvailable")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-500" aria-hidden />
            {t("legendEmpty")}
          </span>
          {stations && (
            <span className="text-slate-400">{t("stationCount", { count: stations.length })}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {updatedAt && (
            <span>
              {t("updatedAt", {
                time: updatedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
              })}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-400 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {t("refresh")}
          </button>
        </div>
      </div>

      <div className="relative h-[60vh] min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 lg:h-[720px]">
        <div ref={containerRef} className="h-full w-full bg-white" />
        {!stations && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-sm text-slate-400">
            {t("loading")}
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/85 px-6 text-center text-sm text-slate-400">
            {t("error")}
          </div>
        )}
      </div>
    </div>
  );
}
