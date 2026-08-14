"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import type { Course } from "@/lib/courses";
import { pickBestMode } from "@/lib/transit-format";
import type { RouteLeg } from "@/lib/routes";

/* eslint-disable @typescript-eslint/no-explicit-any */
type KakaoNS = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** 지도에 그릴 이동 수단 — walk/transit은 TMap 실제 경로, straight는 직선 폴백 */
export type MapMode = "best" | "walk" | "transit" | "taxi" | "straight";

/** 탈것 종류별 색 (도보는 회색 점선으로 따로 처리) */
const MODE_COLOR: Record<string, string> = {
  BUS: "#38bdf8",
  SUBWAY: "#a78bfa",
  EXPRESSBUS: "#38bdf8",
  TRAIN: "#a78bfa",
  AIRPLANE: "#f472b6",
};

/**
 * 코스 경로를 카카오맵에 그린다.
 *
 * TMap이 주는 좌표는 [경도, 위도] WGS84라 kakao.maps.LatLng(위도, 경도)로 뒤집어 넣는다.
 * 도보 구간은 회색 점선, 탈것 구간은 수단별 색 실선으로 구분한다.
 */
export default function CourseMap({
  course,
  mode = "straight",
}: {
  course: Course;
  mode?: MapMode;
}) {
  const locale = useLocale();
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

      // 컨테이너 크기가 생성 시점과 달라졌으면 내부 크기를 다시 맞춘다.
      // 어긋난 채로 두면 타일은 보여도 클릭·드래그 히트 영역이 틀어져
      // 지도가 죽은 것처럼 된다 (탭 이동 후 재선택 등에서 보고됨)
      map.relayout();

      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];

      const stopPos = course.stops.map(
        (s) => new kakao.maps.LatLng(s.mapY, s.mapX),
      );
      const bounds = new kakao.maps.LatLngBounds();
      stopPos.forEach((p: KakaoNS) => bounds.extend(p));

      const line = (
        path: KakaoNS[],
        color: string,
        dashed: boolean,
        weight = 5,
        opacity = 0.95,
      ) => {
        const pl = new kakao.maps.Polyline({
          path,
          strokeWeight: weight,
          strokeColor: color,
          strokeOpacity: opacity,
          strokeStyle: dashed ? "shortdash" : "solid",
        });
        pl.setMap(map);
        overlaysRef.current.push(pl);
      };

      course.legs.forEach((leg, i) => {
        // 추천 모드는 구간마다 권하는 수단이 다르므로 그 수단의 경로를 그린다
        const picked = mode === "best" ? pickBestMode(leg) : mode;
        const route =
          picked === "walk"
            ? leg.walk
            : picked === "transit"
              ? leg.transit
              : picked === "taxi"
                ? leg.taxi
                : null;

        // 실제 경로가 없으면(모드 straight, 미계산, 경로 없음) 직선으로 잇는다.
        // 실제 경로선과 헷갈리지 않게 흐리고 얇게 그린다 — 색·굵기가 같으면
        // 도보 탭을 눌러도 아무것도 안 바뀐 것처럼 보인다.
        if (mode === "straight" || !route || route.status !== "ok" || !route.legs.length) {
          line(
            [stopPos[i], stopPos[i + 1]],
            leg.together ? "#fbbf24" : "#64748b",
            !leg.together,
            3,
            leg.together ? 0.9 : 0.55,
          );
          return;
        }

        route.legs.forEach((seg: RouteLeg) => {
          if (seg.path.length < 2) return;
          const path = seg.path.map(
            ([lng, lat]) => new kakao.maps.LatLng(lat, lng),
          );
          path.forEach((p: KakaoNS) => bounds.extend(p));
          // 도보는 초록 점선, 탈것은 수단별 색 실선 — 직선 폴백(흐린 회색)과 확실히 구분된다
          const isWalk = seg.mode === "WALK";
          line(
            path,
            isWalk ? "#34d399" : (MODE_COLOR[seg.mode] ?? "#38bdf8"),
            isWalk,
            isWalk ? 5 : 6,
          );

          // 탈것 구간 시작점에 노선명 표시 (버스 번호·호선)
          if (!isWalk && seg.route) {
            const ov = new kakao.maps.CustomOverlay({
              position: path[Math.floor(path.length / 2)],
              yAnchor: 1.4,
              zIndex: 6,
              content: `<div style="padding:2px 7px;border-radius:999px;background:${MODE_COLOR[seg.mode] ?? "#38bdf8"};color:#0f172a;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.5)">${seg.route.replace(/^[^:]*:/, "")}</div>`,
            });
            ov.setMap(map);
            overlaysRef.current.push(ov);
          }
        });
      });

      // 번호 마커 (경로 위에 오도록 마지막에) — 누르면 그 스팟 상세로 이동
      course.stops.forEach((s, i) => {
        const el = document.createElement("div");
        el.innerHTML = `<div title="${s.title.replace(/"/g, "&quot;")}" style="width:26px;height:26px;border-radius:50%;background:#fbbf24;color:#0f172a;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;border:2px solid #0f172a;box-shadow:0 2px 8px rgba(0,0,0,.5);cursor:pointer">${i + 1}</div>`;
        // SDK가 오버레이 클릭을 지도 이벤트로 삼키지 않게 여기서 끊는다
        ["mousedown", "touchstart"].forEach((type) =>
          el.addEventListener(type, (e) => e.stopPropagation()),
        );
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          window.location.href = `/${locale}/spots/${encodeURIComponent(s.contentId)}`;
        });
        const ov = new kakao.maps.CustomOverlay({
          position: stopPos[i],
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 10,
          content: el,
        });
        ov.setMap(map);
        overlaysRef.current.push(ov);
      });

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
      draw(); // 이미 로드됨 → 코스·모드 변경 시 즉시 갱신
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
  }, [course, mode, locale]);

  // 컨테이너 크기 변화(반응형 h-80↔500px, 사이드바 접힘 등)를 지도에 반영.
  // relayout 없이 크기만 바뀌면 상호작용 좌표가 어긋난다
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.relayout();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-white/10">
      <div ref={containerRef} className="h-full w-full bg-slate-900" />
    </div>
  );
}
