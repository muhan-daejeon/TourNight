"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { TrainFront } from "lucide-react";

/**
 * 현재 시각(분 단위 타임스탬프). 서버 스냅샷은 null — 서버가 그린 시각과
 * 클라이언트 시각이 다르면 하이드레이션이 틀어지므로 마운트 후에만 값이 생긴다.
 * 분 단위로 잘라 같은 분에는 같은 값 → 불필요한 리렌더가 없다.
 */
function useNowMinute(): number | null {
  return useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, 30_000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => null,
  );
}

/**
 * 대전 도시철도 1호선 막차 카운트다운 — "야간 서비스"라는 정체성을 숫자로.
 *
 * 대전역 기준 막차는 방면에 따라 약 23:35~23:57이라, 보수적으로 23:35를
 * 기준으로 잡는다(막차를 놓치게 안내하는 것보다 이르게 잡는 쪽이 안전).
 * 정확한 시각은 역·방면마다 다르므로 명소 상세의 정류장별 막차 정보가 최종이다.
 * 서버-클라이언트 시간이 어긋나면 하이드레이션이 틀어지므로 마운트 후에만 그린다.
 */
const LAST_TRAIN = { hour: 23, minute: 35 };

export default function LastTrainCountdown() {
  const t = useTranslations("briefing");
  const nowMs = useNowMinute();
  if (nowMs === null) return null;

  const now = new Date(nowMs);
  const last = new Date(now);
  last.setHours(LAST_TRAIN.hour, LAST_TRAIN.minute, 0, 0);
  const diffMin = Math.floor((last.getTime() - now.getTime()) / 60_000);

  // 새벽(막차 지남~첫차 전)에는 굳이 셈하지 않는다 — 지나갔다는 사실만
  if (diffMin <= 0) {
    return (
      <span className="flex items-center gap-1.5 text-slate-500">
        <TrainFront size={14} />
        {t("lastTrainGone")}
      </span>
    );
  }

  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  const soon = diffMin <= 40;
  return (
    <span
      className={`flex items-center gap-1.5 ${soon ? "font-semibold text-rose-300" : ""}`}
    >
      <TrainFront size={14} className={soon ? "text-rose-300" : "text-emerald-300"} />
      {t("lastTrainIn")}{" "}
      <b className={soon ? "text-rose-200" : "text-white"}>
        {h > 0 ? t("hourMin", { h, m }) : t("minOnly", { m })}
      </b>
    </span>
  );
}
