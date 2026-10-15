import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonalServiceLanding } from "@/components/personal-service-landing";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { personalServiceCopy, type ServicePageLocale } from "@/data/personal-service-pages";

type Props = { params: Promise<{ locale: string }> };
const service = "business-consulting" as const;

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  const copy = personalServiceCopy[service][locale];
  return {
    metadataBase: metadataBaseFor(),
    title: copy.title + " — Holistic House",
    description: copy.description,
    alternates: {
      canonical: `/${locale}/services/business-consulting`,
      languages: {
        en: "/en/services/business-consulting",
        ru: "/ru/services/business-consulting",
        es: "/es/services/business-consulting",
      },
    },
  };
}

export default async function BusinessConsultingPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  return <PersonalServiceLanding locale={locale as ServicePageLocale} service={service} />;
}
