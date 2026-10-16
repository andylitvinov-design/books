import type { Metadata } from "next";
import { PublicNotFound } from "@/components/public-not-found";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "404 — Holistic House",
  robots: { index: false, follow: true },
};

export default async function LocalizedNotFound() {
  const locale = (await headers()).get("x-public-page-locale");
  return <PublicNotFound locale={locale === "ru" ? "ru" : "en"} />;
}
