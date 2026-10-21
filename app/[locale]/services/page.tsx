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
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
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
} as const;

export function generateStaticParams() { return getHomeopathyLocaleParams(); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const current = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: current.title,
    description: current.description,
    alternates: {
      canonical: "/" + locale + "/services",
      languages: { ru: "/ru/services", en: "/en/services", es: "/es/services", "x-default": "/en/services" },
    },
    openGraph: { type: "website", siteName: "Holistic House", locale: locale === "ru" ? "ru_RU" : "en_CA",
      url: "/" + locale + "/services", title: current.title, description: current.description,
      images: [{ url: "/images/holistic-house/andy-about.png", alt: "Andrey Litvinov — Holistic House" }] },
    twitter: { card: "summary_large_image", title: current.title, description: current.description,
      images: ["/images/holistic-house/andy-about.png"] },
  };
}

export default async function ServicesPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  // Old shared links to the optional finder remain valid after moving the
  // marketplace out of Andrey's personal consultation landing.
  if ((await searchParams)?.catalog === "1") redirect("/" + locale + "/services/catalog#service-listings");
  const current = copy[locale as Locale];
  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <ServicesExplorerProvider>
        <ServicesConversionHero locale={locale as Locale} />
        <ServicesStudioOffers locale={locale as Locale} />
      </ServicesExplorerProvider>
      <ServicesIntroMedia locale={locale as Locale} />
      <PersonalTestimonials locale={locale as Locale} variant="services" />
      <ServicesMethodVideos locale={locale as Locale} />
      <PublicConsultationCta locale={locale as Locale} id="consultation" serviceBooking wiseEnabled={wisePaymentsEnabled()} paypalPersonalEnabled={personalPayPalEnabled()} />
      <ServicesDirectoryInvitation locale={locale as Locale} />
      <p className="remedy-disclaimer services-disclaimer">{current.note}</p>
      <CompactLeadCapture locale={locale as Locale} serviceTitle="Personal service selection with Andrey" title={current.footerTitle} lead={current.footerLead} />
    </main>
  );
}
