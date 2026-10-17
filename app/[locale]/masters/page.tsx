import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import type { PublicPractitioner } from "@/lib/practitioners/public-types";
import { MarketplaceMasterFinder } from "@/components/master-network-explorer";
import styles from "./masters-page.module.css";

type PageProps = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found" };
  return {
    metadataBase: metadataBaseFor(),
    title: (locale === "ru" ? "Практики" : locale === "es" ? "Profesionales" : "Practitioners") + " | Holistic House",
    description: locale === "ru"
      ? "Найдите практику и отправьте запрос на дистанционную энергетическую поддержку."
      : locale === "es"
        ? "Encuentra profesionales y solicita apoyo energético a distancia."
        : "Find a practitioner and request remote energy support.",
    alternates: {
      canonical: `/${locale}/masters`,
      languages: { en: "/en/masters", ru: "/ru/masters", es: "/es/masters" },
    },
  };
}

export default async function MastersPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const ru = locale === "ru", es = locale === "es";
  let practitioners: PublicPractitioner[] = [];
  try {
    practitioners = await createPractitionerRepository(getAppConfig()).listPublicPractitioners(locale);
  } catch {
    // The finder has an explicit empty state; never invent or hard-code practitioners.
  }

  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <section className={styles.hero} aria-labelledby="practitioners-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{ru ? "HOLISTIC HOUSE · МАСТЕРА" : es ? "HOLISTIC HOUSE · PROFESIONALES" : "HOLISTIC HOUSE · PRACTITIONERS"}</p>
          <h1 id="practitioners-title">{ru ? "Найдите своего мастера" : es ? "Encuentra tu profesional" : "Find your practitioner"}</h1>
          <p>{ru ? "Практики, личные сеансы и дистанционная поддержка." : es ? "Sesiones personales y apoyo a distancia, en un solo lugar." : "Personal sessions and remote support, all in one place."}</p>
        </div>
        <div className={styles.heroActions}>
          <Link className={styles.supportAction} href={`/${locale}/services/remote-energy-support`}>
            <span aria-hidden="true">✦</span>
            {ru ? "Заказать энергоподдержку" : es ? "Solicitar apoyo energético" : "Request energy support"}
            <span aria-hidden="true">→</span>
          </Link>
          <Link className={styles.servicesAction} href={`/${locale}/services`}>
            {ru ? "Все услуги" : es ? "Todos los servicios" : "All services"} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
      <MarketplaceMasterFinder practitioners={practitioners} locale={locale} />
    </main>
  );
}
