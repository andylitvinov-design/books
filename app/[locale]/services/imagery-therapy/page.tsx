import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonalServiceLanding } from "@/components/personal-service-landing";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { personalServiceCopy, type ServicePageLocale } from "@/data/personal-service-pages";

type Props = { params: Promise<{ locale: string }> };
const service = "imagery-therapy" as const;

export function generateStaticParams() { return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }]; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  const t = personalServiceCopy[service][locale];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title + " — Holistic House",
    description: t.description,
    alternates: {
      canonical: `/${locale}/services/imagery-therapy`,
      languages: { en: "/en/services/imagery-therapy", ru: "/ru/services/imagery-therapy", es: "/es/services/imagery-therapy" },
    },
  };
}

export default async function ServicePage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  return <PersonalServiceLanding locale={locale as ServicePageLocale} service={service} />;
}
