import { Fragment } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { ArrowRight, Bike, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import PageHero, { PageBody } from "@/components/PageHero";

/** 문장을 마침표(온점) 기준으로 줄바꿈한다 — 로케일별로 온점 문자가 다르다
 * (ko·en: ".", ja·zh: "。"). whitespace-pre-line과 함께 쓴다 */
function breakSentences(text: string): string {
  return text.replace(/([.。])(?!\n)/g, "$1\n").trim();
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 문장 속 특정 구절 아래에 민트 형광펜 효과를 준다 */
function highlightMint(text: string, words: string[]) {
  if (words.length === 0) return text;
  const pattern = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "g");
  return text.split(pattern).map((part, i) =>
    words.includes(part) ? (
      <span key={i} className="mint-highlight font-semibold text-slate-900">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** "대전"은 어느 도시인가요 문단에서 형광펜 표시할 구절 — 언어마다 실제
 * 표현이 달라 로케일별로 고른다 */
const CITY_HIGHLIGHTS: Record<string, string[]> = {
  ko: ["과학의 도시", "'과학수도'", "성심당 빵", "칼국수"],
  en: ["science capital", "Sungsimdang bakery", "kalguksu noodles"],
  ja: ["科学の街", "「科学首都」", "聖心堂のパン", "カルグクス"],
  zh: ["科学之城", '"科学首都"', "圣心堂面包", "刀削面"],
};

/** 꿈씨패밀리 문단에서 "꿈돌이"(캐릭터 이름)에 형광펜 효과 */
const FAMILY_HIGHLIGHTS: Record<string, string[]> = {
  ko: ["꿈돌이"],
  en: ["Kkumdori"],
  ja: ["クムドリ"],
  zh: ["Kkumdori"],
};

/** 타슈 문단에서 형광펜 표시할 구절 */
const TASHU_HIGHLIGHTS: Record<string, string[]> = {
  ko: ["공공자전거", "무료"],
  en: ["public bike", "free"],
  ja: ["公共自転車", "無料"],
  zh: ["公共自行车", "免费"],
};

/** 이용 안내·요금 안내 — 항목명·값이 줄마다 나란히 줄맞춰 보이도록
 * (탭으로 구분한 것과 같은 효과) 표(grid)로 렌더링한다 */
interface InfoRow {
  label: string;
  value: string;
}
const USAGE_ROWS: Record<string, InfoRow[]> = {
  ko: [
    { label: "이용대상", value: "만 15세 이상" },
    { label: "대여시간", value: "05-24시(3-11월은 24시간)" },
    { label: "반납시간", value: "24시간" },
  ],
  en: [
    { label: "Eligibility", value: "Age 15 and up" },
    { label: "Rental hours", value: "5am-midnight (24hrs Mar-Nov)" },
    { label: "Return hours", value: "24 hours" },
  ],
  ja: [
    { label: "利用対象", value: "満15歳以上" },
    { label: "貸出時間", value: "05-24時(3-11月は24時間)" },
    { label: "返却時間", value: "24時間" },
  ],
  zh: [
    { label: "使用对象", value: "满15周岁以上" },
    { label: "租借时间", value: "05-24点(3-11月为24小时)" },
    { label: "归还时间", value: "24小时" },
  ],
};
const FEE_ROWS: Record<string, InfoRow[]> = {
  ko: [
    { label: "기본 사용료", value: "1시간 무료" },
    { label: "추가 사용료", value: "30분당 500원" },
  ],
  en: [
    { label: "Base fee", value: "Free for the first hour" },
    { label: "Extra fee", value: "KRW 500 per 30 min" },
  ],
  ja: [
    { label: "基本料金", value: "1時間無料" },
    { label: "追加料金", value: "30分ごとに500ウォン" },
  ],
  zh: [
    { label: "基本费用", value: "1小时免费" },
    { label: "追加费用", value: "每30分钟500韩元" },
  ],
};
const FEE_NOTE: Record<string, string> = {
  ko: "1시간 내 반납 후 재대여 시 추가요금 없음",
  en: "No extra charge if returned and re-rented within the hour",
  ja: "1時間以内に返却後再貸出すれば追加料金なし",
  zh: "1小时内归还后再借不收取追加费用",
};

/** 항목명·값 표 — 항목명은 굵게, 값은 그 옆줄에 나란히 */
function InfoTable({ rows }: { rows: InfoRow[] }) {
  return (
    <div className="mt-2 inline-grid grid-cols-[auto_auto] gap-x-3 gap-y-1.5 text-left text-sm text-slate-600">
      {rows.map((row, i) => (
        <Fragment key={i}>
          <span className="font-bold text-slate-900">{row.label}</span>
          <span>{row.value}</span>
        </Fragment>
      ))}
    </div>
  );
}

/**
 * About 대전 — 처음 온 여행자를 위한 도시 소개 (피드백 11).
 * ① 대전은 어느 도시인가요 ② 대전의 캐릭터 꿈씨패밀리 ③ 무료 자전거 타슈
 * 소개 + 이용 방법(STEP 1~4) + 이용·요금 안내 + CTA.
 */
export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const cityHighlights = CITY_HIGHLIGHTS[locale] ?? CITY_HIGHLIGHTS.ko;
  const familyHighlights = FAMILY_HIGHLIGHTS[locale] ?? FAMILY_HIGHLIGHTS.ko;
  const tashuHighlights = TASHU_HIGHLIGHTS[locale] ?? TASHU_HIGHLIGHTS.ko;
  const usageRows = USAGE_ROWS[locale] ?? USAGE_ROWS.ko;
  const feeRows = FEE_ROWS[locale] ?? FEE_ROWS.ko;
  const feeNote = FEE_NOTE[locale] ?? FEE_NOTE.ko;

  return (
    <>
      <PageHero
        image="/spots/hanbit-tower.jpg"
        overline="ABOUT DAEJEON"
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <PageBody>
        {/* ① 대전은 어느 도시인가요? */}
        <section className="mx-auto max-w-3xl py-8 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-daejeon-blue sm:text-3xl">
            {t("cityTitle")}
          </h2>
          <p className="mt-5 whitespace-pre-line text-[18px] leading-relaxed text-slate-600">
            {highlightMint(breakSentences(t("cityBody")), cityHighlights)}
          </p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["stat1", "stat2", "stat3", "stat4"] as const).map((k) => (
              <div key={k} className="rounded-xl bg-slate-50 px-3 py-4">
                <p className="text-lg font-extrabold text-slate-900">{t(`${k}.value`)}</p>
                <p className="mt-1 text-xs text-slate-500">{t(`${k}.label`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ② 대전의 캐릭터, 꿈씨패밀리 — 제목 색은 "대전은 어느 도시인가요?"와 통일 */}
        <section className="mx-auto max-w-3xl border-t border-slate-200 py-10 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-daejeon-blue sm:text-3xl">
            {t("familyTitle")}
          </h2>
          <p className="mx-auto mt-5 max-w-xl whitespace-pre-line text-[18px] leading-relaxed text-slate-600">
            {highlightMint(breakSentences(t("familyBody")), familyHighlights)}
          </p>
          {/* 원래 크기(h-56/h-64)의 1.5배 */}
          <div className="relative mt-7 h-[21rem] w-full overflow-hidden rounded-2xl bg-slate-50 sm:h-[24rem]">
            <Image
              src="/about/kkumssi-family.png"
              alt=""
              fill
              sizes="(min-width: 640px) 768px, 100vw"
              className="object-contain p-4"
            />
          </div>
        </section>

        {/* ③ 무료 자전거 타슈 — 제목 색은 "대전은 어느 도시인가요?"와 통일 */}
        <section id="tashu" className="border-t border-slate-200 py-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="flex items-center justify-center gap-2 text-2xl font-extrabold tracking-tight text-daejeon-blue sm:text-3xl">
              <Bike size={26} />
              {t("tashuTitle")}
            </h2>
            <p className="mx-auto mt-5 max-w-xl whitespace-pre-line text-[18px] leading-relaxed text-slate-600">
              {highlightMint(breakSentences(t("tashuBody")), tashuHighlights)}
            </p>
          </div>

          {/* STEP 1~4 — "STEP n + 안내 문구" 한 묶음을 각지지 않은 동그란
              박스(원) 안에 넣는다. 다른 글자들과 확실히 떨어지도록 위·아래
              여백을 넉넉하게(60px씩). 원 안 문구는 이전의 0.8배 크기.
              -mx-[calc(50%-50vw)]로 화면 끝까지 완전히 풀어준다 */}
          <div className="mx-[calc(50%-50vw)] mb-[60px] mt-[60px] grid w-screen grid-cols-1 gap-x-6 gap-y-8 px-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["step1Body", "step2Body", "step3Body", "step4Body"] as const).map((k, i) => (
              <div key={k} className="flex justify-center">
                <div className="flex h-[324px] w-[324px] shrink-0 flex-col items-center justify-center rounded-full border-2 border-daejeon-green/40 bg-slate-50 px-3 text-center">
                  <p className="text-[1.75rem] font-extrabold text-daejeon-green">{t("step", { n: i + 1 })}</p>
                  <p className="mt-2 whitespace-pre-line text-[21px] leading-snug text-slate-900">{t(k)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 이용·요금 안내 — 박스 없이 문자열만, 두 열(이용 안내·요금 안내)을
              화면 가운데 정렬, 두 열 사이 여백을 훨씬 넉넉하게(80px). 라벨
              글자 크기는 원래(text-base=1rem)의 2배 */}
          <div className="mx-auto flex max-w-3xl flex-wrap items-start justify-center gap-x-[80px] gap-y-8 text-center">
            <div>
              <p className="text-[2rem] font-extrabold text-daejeon-green">{t("usageInfoTitle")}</p>
              <InfoTable rows={usageRows} />
            </div>
            <div>
              <p className="text-[2rem] font-extrabold text-daejeon-green">{t("feeInfoTitle")}</p>
              <InfoTable rows={feeRows} />
              <p className="mt-2 text-left text-sm text-slate-600">※ {feeNote}</p>
            </div>
          </div>

          {/* 기존 이미지 + CTA — 위 간격은 45px */}
          <div className="mx-auto mt-[45px] max-w-3xl text-center">
            <div className="relative mx-auto h-52 max-w-xl overflow-hidden rounded-2xl">
              <Image
                src="/spots/expo-bridge.jpg"
                alt=""
                fill
                sizes="(min-width: 640px) 576px, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-slate-950/35" />
              <p className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-1.5 text-sm font-bold text-white drop-shadow">
                <MapPin size={14} />
                {t("tashuCaption")}
              </p>
            </div>
            <Link
              href="/night-bike"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-daejeon-orange px-8 py-3.5 text-sm font-bold text-white transition hover:bg-amber-500"
            >
              {t("tashuCta")}
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </PageBody>
    </>
  );
}
