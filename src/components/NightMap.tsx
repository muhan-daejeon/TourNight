"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { NightSpot } from "@/lib/kto";

// 대전 중심 좌표
const DAEJEON_CENTER = { lat: 36.3504, lng: 127.3845 };

// 카테고리별 핀 색상 (리스트 배지 색과 동일 계열)
const PIN_COLOR: Record<string, string> = {
  science: "#38bdf8",
  nature: "#34d399",
  festival: "#f472b6",
  city: "#fbbf24",
};

function pinSvg(color: string, selected: boolean) {
  const stroke = selected ? 'stroke="#ffffff" stroke-width="2"' : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38"><path d="M14 1C6.8 1 1 6.8 1 14c0 9.8 13 23 13 23s13-13.2 13-23C27 6.8 21.2 1 14 1z" fill="${color}" ${stroke}/><circle cx="14" cy="14" r="5" fill="#0f172a"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type KakaoNS = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface MarkerEntry {
  marker: KakaoNS;
  category: string;
  spot: NightSpot;
}

export default function NightMap({
  spots,
  visibleIds,
  selectedId = null,
  onSelect,
}: {
  spots: NightSpot[];
  visibleIds?: Set<string>;
  selectedId?: string | null;
  onSelect?: (contentId: string | null) => void;
}) {
  const t = useTranslations("home");
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const kakaoRef = useRef<KakaoNS>(null);
  const mapRef = useRef<KakaoNS>(null);
  const overlayRef = useRef<KakaoNS>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const prevSelectedRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const markerImage = (category: string, selected: boolean) => {
    const kakao = kakaoRef.current;
    const size = selected ? 38 : 28;
    const h = selected ? 52 : 38;
    return new kakao.maps.MarkerImage(
      pinSvg(PIN_COLOR[category] ?? "#fbbf24", selected),
      new kakao.maps.Size(size, h),
      { offset: new kakao.maps.Point(size / 2, h) },
    );
  };

  // 지도·마커는 최초 1회만 생성
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const init = () => {
      const { kakao } = window as KakaoNS;
      kakao.maps.load(() => {
        kakaoRef.current = kakao;
        // 단일 스팟(상세 페이지)이면 해당 위치에 바로 포커스
        const single = spots.length === 1 ? spots[0] : null;
        const map = new kakao.maps.Map(container, {
          center: single
            ? new kakao.maps.LatLng(single.mapY, single.mapX)
            : new kakao.maps.LatLng(DAEJEON_CENTER.lat, DAEJEON_CENTER.lng),
          level: single ? 5 : 8,
        });
        map.addControl(
          new kakao.maps.ZoomControl(),
          kakao.maps.ControlPosition.RIGHT,
        );
        // 빈 지도 클릭 시 선택 해제
        kakao.maps.event.addListener(map, "click", () =>
          onSelectRef.current?.(null),
        );
        mapRef.current = map;

        spots.forEach((spot) => {
          const marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(spot.mapY, spot.mapX),
            title: spot.title,
            image: markerImage(spot.category, false),
          });
          marker.setMap(map);
          kakao.maps.event.addListener(marker, "click", () =>
            onSelectRef.current?.(spot.contentId),
          );
          markersRef.current.set(spot.contentId, {
            marker,
            category: spot.category,
            spot,
          });
        });
      });
    };

    if ("kakao" in window) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY}&autoload=false`;
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots]);

  // 현재 필터(카테고리+검색)를 통과한 스팟만 마커 표시
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(({ marker }, id) => {
      marker.setMap(!visibleIds || visibleIds.has(id) ? map : null);
    });
  }, [visibleIds]);

  // 선택된 스팟: 핀 강조 + 확대 이동 + 이름 오버레이
  useEffect(() => {
    const kakao = kakaoRef.current;
    const map = mapRef.current;
    if (!kakao || !map) return;

    // 이전 선택 원복
    const prev = prevSelectedRef.current
      ? markersRef.current.get(prevSelectedRef.current)
      : null;
    if (prev) prev.marker.setImage(markerImage(prev.category, false));
    overlayRef.current?.setMap(null);
    prevSelectedRef.current = selectedId;

    if (!selectedId) return;
    const entry = markersRef.current.get(selectedId);
    if (!entry) return;

    entry.marker.setImage(markerImage(entry.category, true));
    entry.marker.setZIndex(10);

    const { spot } = entry;
    const pos = new kakao.maps.LatLng(spot.mapY, spot.mapX);
    const color = PIN_COLOR[spot.category] ?? "#fbbf24";
    const img = spot.imageUrl
      ? `<div style="height:108px;background:url('${spot.imageUrl}') center/cover"></div>`
      : "";
    const overlay = new kakao.maps.CustomOverlay({
      position: pos,
      yAnchor: 1.12,
      content: `
        <div style="width:230px;transform:translateY(-58px);background:#0f172a;border:1px solid rgba(255,255,255,.15);border-radius:14px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.55)">
          ${img}
          <div style="padding:10px 12px 12px">
            <div style="font-size:11px;font-weight:700;letter-spacing:.02em;color:${color}">${t(`categories.${spot.category}`)}</div>
            <div style="margin-top:2px;font-size:14px;font-weight:700;color:#fff;line-height:1.35">${spot.title}</div>
            <div style="margin-top:3px;font-size:12px;color:#94a3b8;line-height:1.4">${spot.addr}</div>
            ${spots.length > 1 ? `<a href="/${locale}/spots/${encodeURIComponent(spot.contentId)}" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()" onclick="event.stopPropagation();window.location.href=this.href;return false" style="display:inline-block;margin-top:8px;padding:4px 2px;font-size:12px;font-weight:700;color:#fbbf24;text-decoration:none;cursor:pointer">${t("viewDetail")} →</a>` : ""}
          </div>
        </div>`,
    });
    overlay.setMap(map);
    overlayRef.current = overlay;

    if (map.getLevel() > 5) map.setLevel(5, { anchor: pos });
    map.panTo(pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-white/10">
      <div ref={containerRef} className="h-full w-full bg-slate-900" />
    </div>
  );
}
