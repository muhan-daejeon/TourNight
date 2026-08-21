"use client";

import type { PersonalityType } from "@/lib/personality-test";

/**
 * 7개 성향 점수를 7각형 레이더로 그린다 (기획 목업의 성향 상세 분석 차트).
 * 값은 0~1로 정규화된 상태로 받는다. 순수 SVG라 별도 라이브러리·이미지가 없다.
 */
export default function PersonalityRadar({
  values,
  label,
  size = 260,
}: {
  values: { type: PersonalityType; value: number }[];
  /** 축 라벨 텍스트를 성향 키로 얻는다 */
  label: (type: PersonalityType) => string;
  size?: number;
}) {
  const n = values.length;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 44; // 라벨 자리 여백
  const rings = [0.25, 0.5, 0.75, 1];

  // i번째 축의 각도 (12시 방향부터 시계방향)
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, r: number) => ({
    x: cx + Math.cos(angle(i)) * radius * r,
    y: cy + Math.sin(angle(i)) * radius * r,
  });
  const toPath = (r: number | ((i: number) => number)) =>
    values
      .map((_, i) => {
        const rr = typeof r === "function" ? r(i) : r;
        const p = point(i, rr);
        return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto h-auto w-full max-w-[300px]"
      role="img"
      aria-label="personality radar chart"
    >
      {/* 배경 격자 링 */}
      {rings.map((r) => (
        <path
          key={r}
          d={toPath(r)}
          fill="none"
          stroke="rgba(148,163,184,0.18)"
          strokeWidth={1}
        />
      ))}
      {/* 중심에서 각 축으로 뻗는 선 */}
      {values.map((_, i) => {
        const p = point(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(148,163,184,0.15)"
            strokeWidth={1}
          />
        );
      })}
      {/* 점수 다각형 */}
      <path
        d={toPath((i) => Math.max(0.04, values[i].value))}
        fill="rgba(129,140,248,0.35)"
        stroke="rgb(129,140,248)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* 꼭짓점 */}
      {values.map((v, i) => {
        const p = point(i, Math.max(0.04, v.value));
        return <circle key={i} cx={p.x} cy={p.y} r={3} fill="rgb(165,180,252)" />;
      })}
      {/* 축 라벨 */}
      {values.map((v, i) => {
        const p = point(i, 1.16);
        const a = angle(i);
        const anchor =
          Math.abs(Math.cos(a)) < 0.3
            ? "middle"
            : Math.cos(a) > 0
              ? "start"
              : "end";
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-slate-300 text-[9px] font-semibold"
          >
            {label(v.type)}
          </text>
        );
      })}
    </svg>
  );
}
