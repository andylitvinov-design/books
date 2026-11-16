import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { SpiritualReadingPageContent, type TarotMasterPreview } from "@/components/services-spiritual-reading";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import type { PublicPractitioner } from "@/lib/practitioners/public-types";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const title = {
  ru: "Spiritual Reading — Дао и Таро",
  en: "Spiritual Reading — Dao & Tarot",
  es: "Spiritual Reading — Dao y Tarot",
} as const;
const description = {
  ru: "Бесплатная символическая подсказка И-Цзин, запрос чтения Дао или Таро и подбор опубликованных мастеров.",
  en: "Free symbolic I Ching reflection, Taoist and Tarot reading enquiries, and published practitioner discovery.",
  es: "Reflexión simbólica del I Ching, solicitudes de lectura de Dao y Tarot y especialistas publicados.",
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  return {
    metadataBase: metadataBaseFor(), title: title[locale] + " | Holistic House",
    description: description[locale],
    alternates: {
      canonical: "/" + locale + "/services/spiritual-reading",
      languages: { ru: "/ru/services/spiritual-reading", en: "/en/services/spiritual-reading",
        es: "/es/services/spiritual-reading", "x-default": "/en/services/spiritual-reading" },
    },
  };
}

async function getTarotMasters(locale: "ru" | "en" | "es"): Promise<{ masters: TarotMasterPreview[]; unavailable: boolean }> {
  try {
    const published = (await createPractitionerRepository(getAppConfig())
      .listPublicPractitioners(locale)) as PublicPractitioner[];
    const tarot = /tarot|таро|arcana|аркан/i;
    const masters = published.filter(master => master.services.some(service =>
      tarot.test([service.copy.title, service.copy.description, ...(service.methods || [])].join(" "))
    )).slice(0, 3).map(master => {
      const matchingService = master.services.find(service =>
        tarot.test([service.copy.title, ...(service.methods || [])].join(" "))
      );
      const rawPhoto = master.profile.photoPath || "";
      return {
        slug: master.slug,
        name: master.profile.displayName || master.profile.name || (locale === "ru" ? "Мастер" : "Practitioner"),
        summary: matchingService?.copy.title || master.profile.professionalTitle || "",
        photo: /^\/(?!\/)/.test(rawPhoto) ? rawPhoto : "",
      };
    });
    return { masters, unavailable: false };
  } catch {
    return { masters: [], unavailable: true };
  }
}

export default async function SpiritualReadingPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const { masters, unavailable } = await getTarotMasters(locale);
  return <>
    <PublicSiteHeader locale={locale} showAssessmentStrip={false}/>
    <SpiritualReadingPageContent locale={locale} masters={masters} mastersUnavailable={unavailable}/>
  </>;
}
