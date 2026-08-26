/**
 * 로딩 중 자리 표시.
 *
 * 화면이 준비될 때까지 아무것도 안 보여주면 누른 게 먹혔는지 알 수 없어 멈춘
 * 것처럼 읽힌다. 실제 화면과 같은 자리에 같은 크기의 회색 덩어리를 먼저 깔아
 * 두면, 같은 시간이 걸려도 "불러오는 중"으로 읽힌다.
 *
 * 실제 요소보다 크거나 작으면 내용이 도착할 때 화면이 튀므로, 자리 표시는 실제
 * 레이아웃의 높이·간격을 그대로 따라가야 한다.
 */
export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`}
    />
  );
}

/** 여러 줄 문단 자리 — 마지막 줄은 짧게 해서 글처럼 보이게 한다 */
export function SkeletonLines({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3.5 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}
