import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/Header";
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
    title: `${t("title")} — ${t("tagline")}`,
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* 배경색·밤하늘 글로우·별은 globals.css의 html/body::before가 담당한다 —
          body에 배경을 깔면 그 뒤(z -1)에 둔 별 레이어가 가려진다 */}
      <body className="min-h-full flex flex-col text-slate-100">
        <NextIntlClientProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          {/* 가입 후 둘러보기 — 어느 페이지에서도 이어지도록 레이아웃에 둔다 */}
          <OnboardingTour />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
