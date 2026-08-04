"use client";

import { useEffect, useRef } from "react";
import type { Course } from "@/lib/courses";

/* eslint-disable @typescript-eslint/no-explicit-any */
type KakaoNS = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** 코스 경로를 카카오맵에 번호 마커 + 구간 폴리라인으로 그린다. */
export default function CourseMap({ course }: { course: Course }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoNS>(null);
  const kakaoRef = useRef<KakaoNS>(null);
  const overlaysRef = useRef<KakaoNS[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!course.stops.length) return;

    const draw = () => {
      const kakao = kakaoRef.current;
      const map = mapRef.current;
      if (!kakao || !map) return;

      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];

      const path = course.stops.map(
        (s) => new kakao.maps.LatLng(s.mapY, s.mapX),
      );

      // 구간 폴리라인 — KTO 이동 연결(together)이면 실선 앰버, 아니면 점선 회색
      course.legs.forEach((leg, i) => {
        const line = new kakao.maps.Polyline({
          path: [path[i], path[i + 1]],
          strokeWeight: 4,
          strokeColor: leg.together ? "#fbbf24" : "#94a3b8",
          strokeOpacity: 0.9,
          strokeStyle: leg.together ? "solid" : "shortdash",
        });
        line.setMap(map);
        overlaysRef.current.push(line);
      });

      // 번호 마커
      course.stops.forEach((s, i) => {
        const ov = new kakao.maps.CustomOverlay({
          position: path[i],
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 5,
          content: `<div style="width:26px;height:26px;border-radius:50%;background:#fbbf24;color:#0f172a;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;border:2px solid #0f172a;box-shadow:0 2px 8px rgba(0,0,0,.5)">${i + 1}</div>`,
        });
        ov.setMap(map);
        overlaysRef.current.push(ov);
      });

      const bounds = new kakao.maps.LatLngBounds();
      path.forEach((p: KakaoNS) => bounds.extend(p));
      map.setBounds(bounds, 48, 48, 48, 48);
    };

    const startInit = () => {
      const { kakao } = window as KakaoNS;
      kakao.maps.load(() => {
        if (cancelled) return;
        kakaoRef.current = kakao;
        if (!mapRef.current && containerRef.current) {
          const map = new kakao.maps.Map(containerRef.current, {
            center: new kakao.maps.LatLng(
              course.stops[0].mapY,
              course.stops[0].mapX,
            ),
            level: 6,
          });
          map.addControl(
            new kakao.maps.ZoomControl(),
            kakao.maps.ControlPosition.RIGHT,
          );
          mapRef.current = map;
        }
        draw();
      });
    };

    if (kakaoRef.current && mapRef.current) {
      draw(); // 이미 로드됨 → 코스 변경 시 즉시 갱신
    } else if ("kakao" in window) {
      startInit();
    } else {
      const script = document.createElement("script");
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY}&autoload=false`;
      script.async = true;
      script.onload = startInit;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [course]);

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-white/10">
      <div ref={containerRef} className="h-full w-full bg-slate-900" />
    </div>
  );
}
