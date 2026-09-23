import type { Metadata } from "next";

import { metadataBaseFor } from "@/data/site-metadata";
import { PwaRegistration } from "@/components/pwa-registration";
import { MobileBottomNavigation } from "@/components/mobile-bottom-navigation";
import { NativeLinkHandler } from "@/components/native-link-handler";
import { NativeExternalLinks } from "@/components/native-external-links";
import "./globals.css";
import "./holistic-house-home.css";

export const metadata: Metadata = {
  metadataBase: metadataBaseFor(),
  title: "Holistic House",
  description: "Holistic House — индивидуальные сессии, практики, программы, препараты и авторские материалы для внутреннего развития.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="font-sans"><PwaRegistration /><NativeLinkHandler /><NativeExternalLinks />{children}<MobileBottomNavigation /></body>
    </html>
  );
}
