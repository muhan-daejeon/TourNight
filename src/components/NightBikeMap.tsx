"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check, Copy, MapPin, RefreshCw, Route } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { TASHU_COURSES, distanceM, type BikeLocale, type TashuCourse } from "@/lib/tashu-courses";
import { loadKakaoMaps } from "@/lib/kakaoMaps";
import type { Course } from "@/lib/courses";

/** Google Play 로고 — 대각선 그라데이션(파랑→초록→노랑→빨강)을 준 재생 버튼
 * 모양으로, 실제 로고의 4색 구성을 간략화해 작은 크기에서도 알아볼 수 있게 했다 */
function GooglePlayIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tn-gplay" x1="4" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00C3FF" />
          <stop offset="0.35" stopColor="#33D67A" />
          <stop offset="0.65" stopColor="#FFCD00" />
          <stop offset="1" stopColor="#FF3D57" />
        </linearGradient>
      </defs>
      <path
        d="M5 3.3v17.4a1 1 0 0 0 1.53.85l14.2-8.7a1 1 0 0 0 0-1.7L6.53 2.45A1 1 0 0 0 5 3.3Z"
        fill="url(#tn-gplay)"
      />
    </svg>
  );
}

/** 구글 플레이 연동 버튼·'타슈' 복사 버튼 — 같은 모양(흰 배경, 각진 모서리).
 * 버튼 높이(패딩 2rem + 테두리 2px)의 절반이 기존 pill(rounded-full)의
 * 유효 반지름이었으니, 그 1/3만큼만 둥글게 — (2rem+2px)/2/3 = (2rem+2px)/6 */
const TASHU_BTN =
  "inline-flex items-center gap-1.5 rounded-[calc((2rem+2px)/6)] border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-daejeon-blue hover:text-daejeon-blue";

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
  // 코스 카드를 누르면 그리는 경로 — 새 코스를 고르면 이전 것부터 지운다
  const routeLineRef = useRef<KakaoNS[]>([]);
  const routeMarkersRef = useRef<KakaoNS[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
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

  /** 추천 코스 카드를 누르면 출발지→경유지를 실제 보행로를 따라 잇는다
   * (피드백: 직선 말고 실제 자전거·보행도로처럼 짜달라, 표현 방식은 코스
   * 만들기가 실제 경로를 가져오는 방식과 같게). 카카오맵 SDK 자체엔
   * 길찾기가 없어, 코스 만들기와 똑같은 소스(toCourse→TMap 보행자 경로,
   * /api/tashu/course)에서 실제 경로를 받아 쓴다 — 인도·차도를 따라가므로
   * 좌표를 일직선으로 잇는 것보다 실제 라이딩 동선에 가깝다. 코스
   * 만들기의 이동수단 탭 UI까지 그대로 가져오지는 않는다 — 자전거 코스에
   * 버스·택시 탭은 맞지 않는다. 구간별로 서버에 캐시돼 다시 누르면 즉시 온다.
   * 이전에 그려 둔 경로가 있으면 먼저 지운다 */
  async function showCourseRoute(tashu: TashuCourse) {
    const { kakao } = window as KakaoNS;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;

    routeLineRef.current.forEach((line: KakaoNS) => line.setMap(null));
    routeLineRef.current = [];
    routeMarkersRef.current.forEach((m) => m.setMap(null));
    routeMarkersRef.current = [];

    setSelectedCourseId(tashu.id);
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

    const points = [tashu.start, ...tashu.stops];
    let legs: ([number, number][] | null)[] = points.slice(0, -1).map(() => null);
    try {
      const res = await fetch(`/api/tashu/course?courseId=${tashu.id}&locale=${bikeLocale}`);
      if (res.ok) {
        const course = (await res.json()).course as Course | null;
        legs =
          course?.legs.map((leg) =>
            leg.walk?.status === "ok" && leg.walk.legs.length
              ? leg.walk.legs.flatMap((seg) => seg.path)
              : null,
          ) ?? legs;
      }
    } catch {
      // 실패하면 아래에서 직선으로 대신 잇는다
    }

    const bounds = new kakao.maps.LatLngBounds();
    const lines: KakaoNS[] = [];
    legs.forEach((leg, i) => {
      // 실제 경로가 있으면 그 좌표열([경도, 위도])을, 없으면 두 지점을 직선으로
      const path = leg?.length
        ? leg.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng))
        : [points[i], points[i + 1]].map((p) => new kakao.maps.LatLng(p.lat, p.lng));
      path.forEach((p: KakaoNS) => bounds.extend(p));
      const pl = new kakao.maps.Polyline({
        path,
        strokeWeight: 5,
        strokeColor: "#35b597",
        strokeOpacity: 0.9,
        strokeStyle: leg?.length ? "solid" : "shortdash",
      });
      pl.setMap(map);
      lines.push(pl);
    });
    routeLineRef.current = lines;

    points.forEach((p, i) => {
      const pos = new kakao.maps.LatLng(p.lat, p.lng);
      bounds.extend(pos);
      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        yAnchor: 0.5,
        zIndex: 10,
        content: `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:${
          i === 0 ? "#f39800" : "#35b597"
        };color:#fff;font-size:11px;font-weight:800;border:2px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.35);">${
          i === 0 ? "S" : i
        }</div>`,
        map,
      });
      routeMarkersRef.current.push(overlay);
    });

    map.setBounds(bounds, 60);
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

    let cancelled = false;
    loadKakaoMaps().then((kakao) => {
      if (cancelled || !containerRef.current) return;

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

    return () => {
      cancelled = true;
    };
  }, [stations, t]);

  return (
    <div>
      {/* 앱 연동 버튼 — 위 히어로 배너("NIGHT BIKE" 박스) 바로 밑에, 20px 정도
          여백만 두고 온다. PageBody 자체에 이미 pt-8(2rem) 위 여백이 있어서,
          그만큼을 음수 마진으로 상쇄한 뒤 20px만 남긴다 — calc라 루트 글자
          크기(1.2배)가 바뀌어도 항상 "2rem을 상쇄하고 20px만" 유지된다.
          안드로이드는 플레이스토어 검색으로 바로, 아이폰은 이름 복사로 안내한다 */}
      <p className="text-center text-sm font-light text-slate-400 [margin-top:calc(20px-2rem)]">
        {t("copyHint")}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <a
          href="https://play.google.com/store/search?q=%ED%83%80%EC%8A%88&c=apps"
          target="_blank"
          rel="noreferrer"
          className={TASHU_BTN}
        >
          <GooglePlayIcon />
          {t("installBtn")}
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
          className={TASHU_BTN}
        >
          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          {copied ? t("copied") : t("copyName")}
        </button>
      </div>

      {/* 타슈 소개(About 대전)로 가는 순 텍스트 링크 — 박스 없이, "추천 타슈
          코스" 제목(coursesTitle)과 같은 크기, 검정 글자. 위아래 요소와 간격을
          띄우기 위해 위아래 여백을 넉넉히 둔다 */}
      <p className="mt-12 mb-8 text-center">
        <Link
          href="/about#tashu"
          className="inline-flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-slate-900 hover:text-daejeon-orange sm:text-3xl"
        >
          {t("learnMore")}
          <ArrowRight size={22} />
        </Link>
      </p>

      {/* 위 링크와 "대여소에서 바로 출발하는 야간 라이딩" 사이 여백을 2배로
          넓히고, 그 한가운데에 가로 구분선을 둔다 */}
      <hr className="mx-auto mt-[25px] w-20 border-t border-slate-200" />

      {/* ── 추천 타슈 코스 — 대여소 밀집 지점과 야간 명소를 조합해 미리 설계.
          현위치가 잡히면 가장 가까운 코스가 맨 앞으로 오고 네온 테두리로 빛난다 ── */}
      <section className="mt-[30px]">
        <div className="mb-5 text-center">
          <p className="text-sm font-semibold text-slate-500">{t("coursesSub")}</p>
          <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-daejeon-green sm:text-3xl">
            {t("coursesTitle")}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {orderedCourses.map((c, i) => {
            const nearest = i === 0 && !!userPos;
            const selected = selectedCourseId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => showCourseRoute(c)}
                className={`group relative overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                  nearest ? "tn-neon border-emerald-400" : selected ? "border-daejeon-blue ring-2 ring-daejeon-blue/30" : "border-slate-200"
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
