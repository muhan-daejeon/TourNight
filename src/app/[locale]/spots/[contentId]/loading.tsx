import Skeleton, { SkeletonLines } from "@/components/Skeleton";
import LoadingAnnounce from "@/components/LoadingAnnounce";

/**
 * 명소 상세 로딩 화면.
 *
 * 이 페이지는 처음 여는 명소일 때 AI 야간 가이드를 그 자리에서 만드느라 5초
 * 넘게 걸린다(두 번째부터는 캐시라 0.2초). 그동안 빈 화면이면 누른 게 먹혔는지
 * 알 수 없으므로, 실제 화면과 같은 자리에 자리 표시를 깔아 둔다.
 */
export default function Loading() {
  return (
    <div>
      <LoadingAnnounce />

      {/* 히어로 — 실제 사진 자리와 같은 높이 */}
      <div className="relative h-80 overflow-hidden bg-white/[0.04] sm:h-[26rem] lg:h-[30rem]">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-white/[0.03] to-slate-950" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-4xl px-4 pb-6">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-2 h-9 w-2/3 sm:h-10" />
            <Skeleton className="mt-3 h-4 w-1/2" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-20">
        {/* 뒤로가기 · 길찾기 줄 */}
        <div className="flex items-center justify-between py-5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            {/* AI 야간 가이드 — 여기가 오래 걸리는 자리다 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <Skeleton className="h-5 w-32" />
              <SkeletonLines lines={4} className="mt-4" />
            </div>
            {/* 정류장·막차 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <Skeleton className="h-5 w-28" />
              <SkeletonLines lines={2} className="mt-4" />
            </div>
            {/* 혼잡도 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <Skeleton className="h-5 w-24" />
              <div className="mt-4 flex gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 flex-1" />
                ))}
              </div>
            </div>
          </div>

          {/* 지도 자리 */}
          <div className="space-y-6">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
