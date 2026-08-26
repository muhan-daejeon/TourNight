import Skeleton from "@/components/Skeleton";
import LoadingAnnounce from "@/components/LoadingAnnounce";

/** 추천 코스 — 상단 배너 + 탭 줄 + 코스 카드 + 오른쪽 지도 */
export default function Loading() {
  return (
    <>
      <LoadingAnnounce />
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <Skeleton className="h-[190px] w-full rounded-3xl sm:h-[210px]" />
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        {/* 탭 줄 (추천 코스 · 맞춤 코스) */}
        <div className="mb-7 flex gap-2 border-b border-white/[0.08] pb-3">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-7 w-28" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-2xl lg:h-[500px]" />
        </div>
      </div>
    </>
  );
}
