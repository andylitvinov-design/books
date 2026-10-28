import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { DistanceHomeopathyGuide } from "@/components/distance-homeopathy-guide";
import { AlchemySoulLanding } from "@/components/alchemy-soul-landing";
import { ServiceReviews } from "@/components/service-reviews";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import { isPublicLocale } from "@/data/academy/catalog";
import type { PublicLocale } from "@/lib/public-locales";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "@/components/alchemy-soul-landing.module.css";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export function generateStaticParams() { return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }]; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  const ru = locale === "ru";
  const es = locale === "es";
  const description = es
    ? "Alquimia del Alma: revisión simbólica de la situación, constelaciones, trabajo con imágenes y reflexión psicohomeopática opcional. No es tratamiento médico."
    : ru
    ? "Алхимия души: расстановочная диагностика, образная гипнотерапия, дополнительная психогомеопатия. Личные сессии с Андреем Литвиновым."
    : "Alchemy of the Soul: systemic constellations, guided-imagery hypnotherapy and optional psycho-homeopathy. Personal sessions with Andrey Litvinov.";
  return {
    metadataBase: metadataBaseFor(),
    title: (es ? "Alquimia del Alma · Psicohomeopatía" : ru ? "Алхимия души · Психогомеопатия" : "Alchemy of the Soul · Psycho-homeopathy") + " — Holistic House",
    description,
    alternates: {
      canonical: "/" + locale + "/services/alchemy-of-soul",
      languages: { en: "/en/services/alchemy-of-soul", ru: "/ru/services/alchemy-of-soul", es: "/es/services/alchemy-of-soul" },
    },
    openGraph: {
      title: es ? "Alquimia del Alma · Psicohomeopatía" : ru ? "Алхимия души · Психогомеопатия" : "Alchemy of the Soul · Psycho-homeopathy",
      description,
      images: [{ url: "/images/holistic-house/andy-about.png", alt: "Andrey Litvinov — Holistic House" }],
    },
  };
}

export default async function AlchemyOfTheSoulPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  // The older homeopathy offering intentionally canonicalizes here. Keep its
  // original service ID so reviews link to the same master's published service.
  // The Spanish static landing is approved, but this legacy listing has no ES
  // localized catalogue snapshot: use EN only to resolve its public ID.
  const reviewService = await createPractitionerRepository(getAppConfig())
    .getPublicService("andy-litvinov", "homeopathy-consultation", locale === "es" ? "en" : locale)
    .catch(() => null);
  return (
    <>
      <PublicSiteHeader locale={locale as PublicLocale} />
      <AlchemySoulLanding locale={locale as PublicLocale} />
      {reviewService && (
        <div className={styles.reviewSection}>
          <ServiceReviews serviceId={reviewService.service.id} locale={locale} />
        </div>
      )}
      <details className={styles.guideDisclosure} data-alchemy-extended-guide>
        <summary>{locale === "ru" ? "Дополнительно: полная статья о дистанционной гомеопатии" : locale === "es" ? "Lectura opcional: guía de homeopatía a distancia" : "Optional reading: full distance-homeopathy guide"}</summary>
        <DistanceHomeopathyGuide locale={locale as PublicLocale} embedded />
      </details>
    </>
  );
}
