import Skeleton from "@/components/Skeleton";
import LoadingAnnounce from "@/components/LoadingAnnounce";

/** 야간 명소 목록 — 상단 배너 + 검색·필터 + 카드 2열 + 오른쪽 고정 지도 */
export default function Loading() {
  return (
    <>
      <LoadingAnnounce />
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <Skeleton className="h-[190px] w-full rounded-3xl sm:h-[210px]" />
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        <Skeleton className="h-11 w-full rounded-full" />
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_560px]">
          <div className="order-2 grid content-start gap-3 sm:grid-cols-2 lg:order-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="order-1 h-80 w-full rounded-2xl lg:order-2 lg:h-[620px]" />
        </div>
      </div>
    </>
  );
}
