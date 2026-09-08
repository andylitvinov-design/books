import type { Metadata } from "next";

import { metadataBaseFor } from "@/data/site-metadata";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: metadataBaseFor(),
  title: "PsiAlchemy",
  description: "Современный локальный каталог книг с поиском, разделами и сохранением позиции чтения.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="font-sans"><PwaRegistration />{children}</body>
    </html>
  );
}
