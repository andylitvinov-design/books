import { Suspense } from "react";
import { HolisticHouseLoadingScene } from "@/components/holistic-house-loading-scene";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HolisticHouseHome } from "@/components/holistic-house-home";
import { homeMetadataFor } from "@/lib/home-seo";

type Props = { searchParams: Promise<{ lang?: string | string[]; full?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
  return homeMetadataFor("en");
}

export default async function HomePage({ searchParams }: Props) {
  const { lang, full } = await searchParams;
  const requested = Array.isArray(lang) ? lang[0] : lang;
  // Preserve existing shared links, but keep locale content on stable URLs.
  if (requested === "ru" || requested === "es") {
    // Keep the explicit full React experience across language selection,
    // instead of accidentally returning to the CDN-first page.
    const requestedFull = Array.isArray(full) ? full[0] : full;
    redirect(`/${requested}${requestedFull === "1" ? "?full=1" : ""}`);
  }
  return (
    <Suspense fallback={<HolisticHouseLoadingScene />}>
      <HolisticHouseHome locale="en" />
    </Suspense>
  );
}
