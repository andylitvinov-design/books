import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BusinessConsultingLanding } from "@/components/business-consulting-landing";
import { businessConsultingCopy, type BusinessLocale } from "@/data/business-consulting-copy";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  const copy = businessConsultingCopy[locale as BusinessLocale];
  const path = "/" + locale + "/services/business-consulting";
  return {
    metadataBase: metadataBaseFor(),
    title: copy.title + " | Holistic House",
    description: copy.seoDescription,
    alternates: {
      canonical: path,
      languages: {
        en: "/en/services/business-consulting",
        ru: "/ru/services/business-consulting",
        es: "/es/services/business-consulting",
        "x-default": "/en/services/business-consulting",
      },
    },
    openGraph: {
      type: "website",
      siteName: "Holistic House",
      locale: locale === "ru" ? "ru_RU" : locale === "es" ? "es_ES" : "en_CA",
      url: path,
      title: copy.title,
      description: copy.seoDescription,
      images: [{ url: "/images/holistic-house/andy-about.png", alt: "Andrey Litvinov — Holistic House" }],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.seoDescription,
      images: ["/images/holistic-house/andy-about.png"],
    },
  };
}

export default async function BusinessConsultingPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const copy = businessConsultingCopy[locale as BusinessLocale];
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: copy.title,
    description: copy.seoDescription,
    serviceType: "Business strategy and coaching",
    provider: { "@type": "Person", name: "Andrey Litvinov" },
    areaServed: { "@type": "Place", name: "Toronto and online" },
    offers: [
      { "@type": "Offer", name: copy.offers[1].name, price: "50", priceCurrency: "EUR" },
      { "@type": "Offer", name: copy.offers[2].name, price: "100", priceCurrency: "EUR" },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <BusinessConsultingLanding locale={locale as BusinessLocale} />
    </>
  );
}
