import type { Metadata } from "next";
import { headers } from "next/headers";
import { metadataBaseFor } from "@/data/site-metadata";
import { PwaRegistration } from "@/components/pwa-registration";
import { MobileBottomNavigation } from "@/components/mobile-bottom-navigation";
import { NativeLinkHandler } from "@/components/native-link-handler";
import { NativeExternalLinks } from "@/components/native-external-links";
import "./globals.css";
import "./holistic-house-home.css";
import "./site-videos.css";
import "./site-video-admin.css";
import "./reader-responsive.css";
import "./ia-v2.css";
import "./academy.css";
import "./yggdrasil-basic-description.css";
import "./catalog-showcase.css";

export const metadata: Metadata = {
  metadataBase: metadataBaseFor(),
  title: "Holistic House",
  description: "Holistic House — индивидуальные сессии, практики, программы, препараты и авторские материалы для внутреннего развития.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Set by middleware from the URL, not from an untrusted incoming header.
  const pageLocale = (await headers()).get("x-public-page-locale");
  const lang = pageLocale === "es" || pageLocale === "en" ? pageLocale : "ru";
  return (
    <html lang={lang}>
      <body className="font-sans"><PwaRegistration /><NativeLinkHandler /><NativeExternalLinks />{children}<MobileBottomNavigation initialLocale={lang} /></body>
    </html>
  );
}
