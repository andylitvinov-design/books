import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HomeIntroVideoSection } from "@/components/home-intro-video-section";
import { HolisticHouseHome } from "@/components/holistic-house-home";
import { homeMetadataFor } from "@/lib/home-seo";

type Props = { searchParams: Promise<{ lang?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
  return homeMetadataFor("en");
}

export default async function HomePage({ searchParams }: Props) {
  const { lang } = await searchParams;
  const requested = Array.isArray(lang) ? lang[0] : lang;
  // Preserve existing shared links, but keep locale content on stable URLs.
  if (requested === "ru" || requested === "es") redirect(`/${requested}`);
  return (
    <HolisticHouseHome
      locale="en"
      introVideoContent={<Suspense fallback={null}><HomeIntroVideoSection locale="en" /></Suspense>}
    />
  );
}
