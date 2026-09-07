"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";

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
      <span key={i} className="font-semibold text-amber-300">
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
      <div className="mx-auto w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center sm:w-1/2 [margin-top:calc(8px-2rem)]">
        <div className="space-y-1.5 text-sm leading-relaxed text-slate-300">
          {t("promoText")
            .split("\n")
            .map((line, i) => (
              <p key={i}>{highlightWords(line, PROMO_HIGHLIGHTS[locale] ?? PROMO_HIGHLIGHTS.ko)}</p>
            ))}
        </div>
      </div>

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
            <span className="text-slate-600">{t("stationCount", { count: stations.length })}</span>
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
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 font-semibold text-slate-300 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {t("refresh")}
          </button>
        </div>
      </div>

      <div className="relative h-[60vh] min-h-[420px] overflow-hidden rounded-2xl border border-white/10 lg:h-[720px]">
        <div ref={containerRef} className="h-full w-full bg-slate-900" />
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
