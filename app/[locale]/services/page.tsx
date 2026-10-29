import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PublicSiteHeader } from "@/components/public-site-header";
import { ServicesConversionHero } from "@/components/services-conversion-hero";
import { ServicesExplorerProvider } from "@/components/services-explorer-state";
import { ServicesStudioOffers } from "@/components/services-studio-offers";
import { ServicesIntroMedia, ServicesMethodVideos, ServicesDirectoryInvitation } from "@/components/services-studio-extras";
import { PersonalTestimonials } from "@/components/personal-testimonials";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { CompactLeadCapture } from "@/components/compact-lead-capture";
import { wisePaymentsEnabled } from "@/lib/commerce/wise-payments";
import { personalPayPalEnabled } from "@/lib/commerce/paypal-personal";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }>; searchParams?: Promise<{ catalog?: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;
// Production release marker: Wu Xing marketplace featured service.

const copy = {
  ru: {
    title: "Индивидуальные услуги — Holistic House",
    description: "Личные сессии в Торонто и онлайн. Три бесплатных способа начать: тесты, письменный анализ ситуации и символический профиль ресурсов У-Син.",
    about: "Об Андрее",
    footerTitle: "Не знаете, с чего начать?",
    footerLead: "Оставьте контакт — Андрей подскажет подходящий формат.",
    note: "Символические практики не заменяют медицинскую диагностику и лечение. Гомеопатия не имеет надёжных доказательств эффективности для лечения заболеваний; конкретные результаты не гарантируются.",
  },
  en: {
    title: "Personal services — Holistic House",
    description: "Personal sessions in Toronto or online, plus three free entry points: self-check tests, a written situation review, and a symbolic Wu Xing resource profile.",
    about: "About Andrey",
    footerTitle: "Not sure where to start?",
    footerLead: "Leave a contact — Andrey will suggest a suitable first step.",
    note: "These symbolic approaches do not replace medical assessment or treatment. Homeopathy lacks reliable evidence for treating health conditions. Individual results are not guaranteed.",
  },
  es: {
    title: "Servicios personales — Holistic House",
    description: "Sesiones personales en Toronto y en línea. Empieza gratis con autoevaluaciones, una revisión escrita de tu situación o un perfil simbólico Wu Xing.",
    about: "Sobre Andrey",
    footerTitle: "¿No sabes por dónde empezar?",
    footerLead: "Deja un contacto y Andrey te ayudará a elegir un primer paso.",
    note: "Estas prácticas simbólicas no sustituyen la evaluación ni el tratamiento médico. La homeopatía no dispone de pruebas fiables de eficacia para tratar enfermedades. No se garantizan resultados.",
  },
} as const;

export function generateStaticParams() { return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }]; }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found" };
  const current = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: current.title,
    description: current.description,
    alternates: {
      canonical: "/" + locale + "/services",
      languages: { ru: "/ru/services", en: "/en/services", es: "/es/services", "x-default": "/en/services" },
    },
    openGraph: { type: "website", siteName: "Holistic House", locale: locale === "ru" ? "ru_RU" : locale === "es" ? "es_ES" : "en_CA",
      url: "/" + locale + "/services", title: current.title, description: current.description,
      images: [{ url: "/images/holistic-house/andy-about.png", alt: "Andrey Litvinov — Holistic House" }] },
    twitter: { card: "summary_large_image", title: current.title, description: current.description,
      images: ["/images/holistic-house/andy-about.png"] },
  };
}

export default async function ServicesPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  // Old shared links to the optional finder remain valid after moving the
  // marketplace out of Andrey's personal consultation landing.
  if ((await searchParams)?.catalog === "1") redirect("/" + locale + "/services/catalog#service-listings");
  const current = copy[locale];
  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <ServicesExplorerProvider>
        <ServicesConversionHero locale={locale} />
        <PublicConsultationCta locale={locale} id="consultation" serviceBooking wiseEnabled={wisePaymentsEnabled()} paypalPersonalEnabled={personalPayPalEnabled()} />
        <ServicesStudioOffers locale={locale} />
      </ServicesExplorerProvider>
      <ServicesIntroMedia locale={locale} />
      <PersonalTestimonials locale={locale} variant="services" />
      <ServicesMethodVideos locale={locale} />
      <ServicesDirectoryInvitation locale={locale} />
      <p className="remedy-disclaimer services-disclaimer">{current.note}</p>
      <CompactLeadCapture locale={locale} serviceTitle="Personal service selection with Andrey" title={current.footerTitle} lead={current.footerLead} />
    </main>
  );
}
