"use client";

import { useEffect, useRef } from "react";
import type { NightSpot } from "@/lib/kto";

// 대전 중심 좌표
const DAEJEON_CENTER = { lat: 36.3504, lng: 127.3845 };

interface KakaoMaps {
  maps: {
    load: (cb: () => void) => void;
    Map: new (el: HTMLElement, opts: object) => object;
    LatLng: new (lat: number, lng: number) => object;
    Marker: new (opts: object) => {
      setMap: (map: object | null) => void;
    };
    InfoWindow: new (opts: object) => {
      open: (map: object, marker: object) => void;
    };
    event: {
      addListener: (target: object, type: string, cb: () => void) => void;
    };
  };
}

interface MarkerEntry {
  marker: { setMap: (map: object | null) => void };
  category: string;
}

export default function NightMap({
  spots,
  activeCategory = "all",
}: {
  spots: NightSpot[];
  activeCategory?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<object | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);

  // 지도·마커는 최초 1회만 생성
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const init = () => {
      const { kakao } = window as unknown as { kakao: KakaoMaps };
      kakao.maps.load(() => {
        const map = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(DAEJEON_CENTER.lat, DAEJEON_CENTER.lng),
          level: 8,
        });
        mapRef.current = map;

        markersRef.current = spots.map((spot) => {
          const marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(spot.mapY, spot.mapX),
            title: spot.title,
          });
          marker.setMap(map);

          const infoWindow = new kakao.maps.InfoWindow({
            content: `<div style="padding:4px 10px;font-size:12px;color:#111;white-space:nowrap">${spot.title}</div>`,
          });
          kakao.maps.event.addListener(marker, "click", () =>
            infoWindow.open(map, marker),
          );

          return { marker, category: spot.category };
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

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
      <div ref={containerRef} className="h-full w-full bg-slate-900" />
      {/* 야간 테마 톤 유지용 다크 오버레이 (지도 조작은 그대로 가능) */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-slate-950/20" />
    </div>
  );
}
