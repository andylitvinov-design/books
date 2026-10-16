import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HomeIntroVideoSection } from "@/components/home-intro-video-section";
import { HolisticHouseHome } from "@/components/holistic-house-home";
import { homeMetadataFor } from "@/lib/home-seo";

type Props = { params: Promise<{ locale: string }> };

// The English home lives at /, Spanish at /es; only /ru is served here.
export function generateStaticParams() { return [{ locale: "ru" }]; }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return (await params).locale === "ru"
    ? homeMetadataFor("ru")
    : { title: "Not found", robots: { index: false } };
}

export default async function RussianHomePage({ params }: Props) {
  if ((await params).locale !== "ru") notFound();
  return (
    <HolisticHouseHome
      locale="ru"
      introVideoContent={<Suspense fallback={null}><HomeIntroVideoSection locale="ru" /></Suspense>}
    />
  );
}
