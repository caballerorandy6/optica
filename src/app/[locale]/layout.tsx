import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import "../globals.css";

import { CartProvider } from "@/components/cart/cart-context";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { routing } from "@/i18n/routing";
import { ogLocale, pageAlternates, SITE_URL } from "@/lib/seo";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f2" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1712" },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: "%s — MIRA Eyewear" },
    description: t("description"),
    alternates: pageAlternates(locale, "/"),
    openGraph: {
      type: "website",
      siteName: "MIRA Eyewear",
      locale: ogLocale(locale),
      title: t("title"),
      description: t("description"),
      url: pageAlternates(locale, "/").canonical as string,
    },
    twitter: {
      card: "summary",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <NextIntlClientProvider>
          <CartProvider>
            <Header />
            {children}
            <Footer />
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
