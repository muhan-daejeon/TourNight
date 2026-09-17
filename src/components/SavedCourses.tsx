"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Route, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useSavedCourses, type SavedCourse } from "./useSavedCourses";

/** 미터 → "2.4km" / "800m" */
const dist = (m: number) =>
  m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;

/**
 * 찜한 코스 목록 (찜 모아보기 페이지).
 *
 * 코스를 통째로 되살릴 수 있는 화면이 저마다 다르다. 성향 코스는 성향 결과
 * 화면이 자기 코스를 펼쳐 주므로 거기로 보내고, AI·설문 코스는 서버에 없어
 * 되살릴 수 없어서 경유지 이름만 보여주고 첫 스팟 상세로 보낸다 (아무 데도
 * 못 가는 것보다 낫다).
 */
function reopenHref(c: SavedCourse) {
  if (c.kind === "persona") return { pathname: "/personality" };
  return { pathname: `/spots/${c.stops[0]?.contentId ?? ""}` };
}

export default function SavedCourses() {
  const t = useTranslations("saved");
  const { courses, remove } = useSavedCourses();

  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <Route size={17} className="text-daejeon-blue" />
        {t("coursesTitle")}
        {courses.length > 0 && (
          <span className="text-sm font-semibold text-slate-400">{courses.length}</span>
        )}
      </h2>

      {courses.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
          {t("coursesEmpty")}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {courses.map((c) => (
            <li
              key={c.id}
              className="group relative rounded-2xl border border-slate-200 bg-white p-4"
            >
              <Link href={reopenHref(c)} className="block">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-daejeon-blue px-2.5 py-0.5 text-[11px] font-bold text-white">
                    {t(`kind.${c.kind}`)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {t("stopsCount", { count: c.stops.length })} · {dist(c.totalM)}
                  </span>
                </p>
                <p className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-slate-900 group-hover:text-daejeon-blue">
                  {c.title}
                </p>
                {/* 경유지 썸네일 — 사진이 있는 곳만 앞에서부터 */}
                <div className="mt-2.5 flex gap-1.5 overflow-hidden">
                  {c.stops
                    .filter((s) => s.imageUrl)
                    .slice(0, 5)
                    .map((s) => (
                      <span
                        key={s.contentId}
                        className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                      >
                        <Image
                          src={s.imageUrl!}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </span>
                    ))}
                </div>
              </Link>
              <button
                type="button"
                onClick={() => remove(c.id)}
                aria-label={t("remove")}
                className="absolute right-3 top-3 rounded-full p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
