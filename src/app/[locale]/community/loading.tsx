import Skeleton, { SkeletonLines } from "@/components/Skeleton";
import LoadingAnnounce from "@/components/LoadingAnnounce";

/** 커뮤니티 — 상단 배너 + 글쓰기 상자 + 글 목록 */
export default function Loading() {
  return (
    <>
      <LoadingAnnounce />
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <Skeleton className="h-[190px] w-full rounded-3xl sm:h-[210px]" />
      </div>
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        {/* 글쓰기 상자 */}
        <Skeleton className="h-36 w-full rounded-2xl" />
        {/* 글 목록 */}
        <div className="mt-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <SkeletonLines lines={2} className="mt-4" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
