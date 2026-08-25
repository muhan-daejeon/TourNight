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
      // 아래 인라인 스크립트가 하이드레이션 전에 심는 data-intro-seen 속성은
      // 서버가 알 수 없어 항상 불일치로 잡힌다 — 의도된 값이므로 경고를 끈다
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        {/* 인트로를 이미 봤으면(재생 예약이 없는 한) 첫 페인트 전에 CSS로 숨긴다.
            리액트가 하이드레이션을 마치기 전까지는 서버가 항상 재생 상태로 그리므로,
            이 스크립트 없이는 새로고침할 때마다 짧게 인트로가 번쩍인다. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var r=localStorage.getItem('tn_intro_replay')==='1';var s=localStorage.getItem('tn_intro_seen')==='1';if(s&&!r)document.documentElement.setAttribute('data-intro-seen','1');}catch(e){}",
          }}
        />
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
