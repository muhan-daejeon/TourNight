"use client";

import { useEffect, useRef } from "react";

interface MapSpot {
  contentId: string;
  title: string;
  mapX: number;
  mapY: number;
}

// 대전 중심 좌표
const DAEJEON_CENTER = { lat: 36.3504, lng: 127.3845 };

export default function NightMap({ spots }: { spots: MapSpot[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const init = () => {
      const { kakao } = window as unknown as {
        kakao: {
          maps: {
            load: (cb: () => void) => void;
            Map: new (el: HTMLElement, opts: object) => object;
            LatLng: new (lat: number, lng: number) => object;
            Marker: new (opts: object) => {
              setMap: (map: object) => void;
            };
            InfoWindow: new (opts: object) => {
              open: (map: object, marker: object) => void;
            };
            event: {
              addListener: (
                target: object,
                type: string,
                cb: () => void,
              ) => void;
            };
          };
        };
      };

      kakao.maps.load(() => {
        const map = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(DAEJEON_CENTER.lat, DAEJEON_CENTER.lng),
          level: 8,
        });

        spots.forEach((spot) => {
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

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800">
      <div ref={containerRef} className="h-80 w-full bg-slate-900 sm:h-96" />
      {/* 야간 테마 톤 유지용 다크 오버레이 (지도 조작은 그대로 가능) */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-slate-950/20" />
    </div>
  );
}
