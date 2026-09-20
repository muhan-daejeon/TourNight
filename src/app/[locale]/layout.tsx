import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/Header";
import MascotGuide from "@/components/MascotGuide";
import Footer from "@/components/Footer";
import OnboardingTour from "@/components/OnboardingTour";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 제목용 서체 — Gmarket Sans Bold. 한글·영문이 한 벌이라 "K-Life 가이드"처럼
// 섞인 제목이나 영문 화면에서도 무게가 어긋나지 않는다(Black Han Sans는 한글은
// 좋았지만 라틴이 넓고 뭉툭해 로고·영문 제목이 깨졌다). 외부 CDN에 기대지
// 않도록 파일을 저장소에 두고 next/font로 묶는다. 굵기는 700 하나만 쓴다
const gmarketSans = localFont({
  src: "../../fonts/GmarketSansBold.woff",
  variable: "--font-display",
  weight: "700",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    title: `${t("title")} - ${t("tagline")}`,
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${gmarketSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900">
        <NextIntlClientProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <MascotGuide />
          <Footer />
          {/* 가입 후 둘러보기 — 어느 페이지에서도 이어지도록 레이아웃에 둔다 */}
          <OnboardingTour />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
