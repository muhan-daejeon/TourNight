"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Route, Users, Navigation, MapPin } from "lucide-react";
import CourseMap from "./CourseMap";
import type { Course } from "@/lib/courses";

function formatDistance(m: number) {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

export default function CourseExplorer({ courses }: { courses: Course[] }) {
  const t = useTranslations("courses");
  const [sel, setSel] = useState(0);

  if (!courses.length) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">{t("empty")}</p>
    );
  }

  const course = courses[Math.min(sel, courses.length - 1)];
  const start = course.stops[0];
  const kakaoStart = `https://map.kakao.com/link/to/${encodeURIComponent(start.title)},${start.mapY},${start.mapX}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* 코스 카드 목록 */}
      <div className="space-y-3">
        {courses.map((c, i) => {
          const active = c.id === course.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSel(i)}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-amber-300/60 bg-amber-300/[0.06]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-slate-100">
                  {t("courseTitle", { name: c.stops[0].title })}
                </h3>
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-300/90">
                  <Route size={13} />
                  {formatDistance(c.totalM)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {t("stopsCount", { count: c.stops.length })}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[13px]">
                {c.stops.map((s, si) => (
                  <span key={s.contentId} className="flex items-center gap-1.5">
                    <span className="text-slate-200">
                      <span className="text-slate-500">{si + 1}.</span>{" "}
                      {s.title}
                    </span>
                    {si < c.stops.length - 1 && (
                      <span className="flex items-center gap-1 text-slate-600">
                        {c.legs[si]?.together && (
                          <span className="flex items-center gap-0.5 rounded-full bg-amber-300/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                            <Users size={9} />
                            {t("together")}
                          </span>
                        )}
                        <span>→</span>
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
        <p className="flex items-center gap-1.5 px-1 pt-1 text-[11px] text-slate-600">
          <MapPin size={11} />
          {t("dataNote")}
        </p>
      </div>

      {/* 지도 + 길찾기 */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <div className="h-80 lg:h-[500px]">
          <CourseMap course={course} />
        </div>
        <a
          href={kakaoStart}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-full bg-amber-400 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
        >
          <Navigation size={15} />
          {t("directions")}
        </a>
      </div>
    </div>
  );
}
