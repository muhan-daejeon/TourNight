"use client";

import { useTranslations } from "next-intl";

/**
 * 로딩 중임을 스크린리더에 알린다.
 *
 * 자리 표시(Skeleton)는 눈으로만 읽히도록 aria-hidden으로 감춰 두었으므로,
 * 보이지 않는 사용자에게는 이 한 줄이 유일한 신호다. role="status"라 화면을
 * 가로채지 않고 조용히 읽힌다.
 *
 * 클라이언트 컴포넌트인 이유는 loading.tsx가 locale 파라미터를 받지 못해서다 —
 * 서버에서 번역을 꺼내려면 요청 로케일을 따로 세워야 하는데, 그러면 정적으로
 * 만들어 둔 페이지가 요청마다 그려지게 된다.
 */
export default function LoadingAnnounce() {
  const t = useTranslations("site");
  return (
    <p role="status" className="sr-only">
      {t("loading")}
    </p>
  );
}
