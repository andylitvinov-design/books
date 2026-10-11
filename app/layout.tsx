import type { Metadata } from "next";
import { headers } from "next/headers";
import { metadataBaseFor } from "@/data/site-metadata";
import { PwaRegistration } from "@/components/pwa-registration";
import { MobileBottomNavigation } from "@/components/mobile-bottom-navigation";
import { SitewideLeadCapture } from "@/components/sitewide-lead-capture";
import { AnalyticsConsent } from "@/components/analytics-consent";
import { Ga4Analytics } from "@/components/ga4-analytics";
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
import "./temple-studies.css";
import "./sitewide-capture.css";
import "./public-wide-layout.css";

export const metadata: Metadata = {
  metadataBase: metadataBaseFor(),
  title: "Holistic House",
  description: "Holistic House — индивидуальные сессии, практики, программы, препараты и авторские материалы для внутреннего развития.",
  verification: { other: { "google-site-verification": "RsXfHdZ-u_AgKVoRSNIv_PKPcGjoDoqBBK3HZLaOzjc" } },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Set by middleware from the URL, not from an untrusted incoming header.
  const pageLocale = (await headers()).get("x-public-page-locale");
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const lang = pageLocale === "es" || pageLocale === "en" ? pageLocale : "ru";
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Holistic House",
    url: metadataBaseFor().toString(),
    inLanguage: ["en", "ru", "es"],
  };
  return (
    <html lang={lang}>
      <head><script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} /></head>
      <body className="font-sans"><PwaRegistration /><NativeLinkHandler /><NativeExternalLinks /><Ga4Analytics nonce={nonce} />{children}<SitewideLeadCapture /><AnalyticsConsent /><MobileBottomNavigation initialLocale={lang} /></body>
    </html>
  );
}
