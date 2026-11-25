import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@/app/site-videos.css";

import { ServiceEnquiryThankYou } from "@/components/service-enquiry-thank-you";
import { getPublishedSiteVideo } from "@/lib/site-videos/public";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Thank you for your request | Holistic House",
  description: "A private confirmation following a service or course enquiry.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ThankYouPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ru" && locale !== "es") notFound();
  // Only intentionally published, vetted public media. No draft/Drive URLs.
  const video = await getPublishedSiteVideo("thank-you:" + locale);
  return (
    <ServiceEnquiryThankYou
      locale={locale}
      video={video ?? null}
    />
  );
}
