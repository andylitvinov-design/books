import type { Metadata } from "next";
import { headers } from "next/headers";
import { PublicNotFound } from "@/components/public-not-found";

export const metadata: Metadata = {
  title: "404 — Holistic House",
  description: "The page could not be found. Explore Holistic House services, free resources and the remedy reference library.",
  robots: { index: false, follow: true },
};

export default async function GlobalNotFound() {
  const locale = (await headers()).get("x-public-page-locale");
  return <PublicNotFound locale={locale === "es" || locale === "ru" ? locale : "en"} />;
}
