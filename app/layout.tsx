import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Books Catalog",
  description: "Современный локальный каталог книг с поиском, разделами и сохранением позиции чтения.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="font-sans">{children}</body>
    </html>
  );
}
