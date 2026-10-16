import type { Metadata } from "next";
import { PublicNotFound } from "@/components/public-not-found";

export const metadata: Metadata = {
  title: "404 — Holistic House",
  robots: { index: false, follow: true },
};

export default async function LocalizedNotFound({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PublicNotFound locale={locale === "ru" ? "ru" : "en"} />;
}
