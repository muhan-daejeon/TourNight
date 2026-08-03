"use client";

import { useEffect, useRef } from "react";
import type { NightSpot } from "@/lib/kto";

// 대전 중심 좌표
const DAEJEON_CENTER = { lat: 36.3504, lng: 127.3845 };

/* eslint-disable @typescript-eslint/no-explicit-any */
type KakaoNS = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface MarkerEntry {
  marker: { setMap: (map: object | null) => void };
  category: string;
  spot: NightSpot;
}

export default function NightMap({
  spots,
  activeCategory = "all",
  selectedId = null,
  onSelect,
}: {
  spots: NightSpot[];
  activeCategory?: string;
  selectedId?: string | null;
  onSelect?: (contentId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kakaoRef = useRef<KakaoNS>(null);
  const mapRef = useRef<KakaoNS>(null);
  const overlayRef = useRef<KakaoNS>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // 지도·마커는 최초 1회만 생성
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const init = () => {
      const { kakao } = window as KakaoNS;
      kakao.maps.load(() => {
        kakaoRef.current = kakao;
        const map = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(DAEJEON_CENTER.lat, DAEJEON_CENTER.lng),
          level: 8,
        });
        map.addControl(
          new kakao.maps.ZoomControl(),
          kakao.maps.ControlPosition.RIGHT,
        );
        mapRef.current = map;

        spots.forEach((spot) => {
          const marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(spot.mapY, spot.mapX),
            title: spot.title,
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
  }, [spots]);

  // 카테고리 필터에 따라 마커 표시/숨김
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(({ marker, category }) => {
      marker.setMap(
        activeCategory === "all" || category === activeCategory ? map : null,
      );
    });
  }, [activeCategory]);

  // 선택된 스팟으로 이동 + 이름 오버레이 표시
  useEffect(() => {
    const kakao = kakaoRef.current;
    const map = mapRef.current;
    if (!kakao || !map) return;

    overlayRef.current?.setMap(null);
    if (!selectedId) return;
    const entry = markersRef.current.get(selectedId);
    if (!entry) return;

    const pos = new kakao.maps.LatLng(entry.spot.mapY, entry.spot.mapX);
    const overlay = new kakao.maps.CustomOverlay({
      position: pos,
      yAnchor: 2.4,
      content: `<div style="background:#0f172a;color:#fff;border:1px solid rgba(251,191,36,.5);border-radius:10px;padding:6px 12px;font-size:13px;font-weight:600;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.5)">${entry.spot.title}</div>`,
    });
    overlay.setMap(map);
    overlayRef.current = overlay;

    if (map.getLevel() > 6) map.setLevel(6, { anchor: pos });
    map.panTo(pos);
  }, [selectedId]);

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-white/10">
      <div ref={containerRef} className="h-full w-full bg-slate-900" />
    </div>
  );
}
