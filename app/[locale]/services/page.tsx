import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PublicSiteHeader } from "@/components/public-site-header";
import { ServicesConversionHero } from "@/components/services-conversion-hero";
import { ServicesAssistMobile } from "@/components/services-assist-mobile";
import { ServicesAssistQuiz } from "@/components/services-assist-quiz";
import { ServicesPersonalConsultationMobile } from "@/components/services-personal-consultation-mobile";
import { AssistReikiSession } from "@/components/assist-reiki-session";
import { ServicesMagicalHelpMobile } from "@/components/services-magical-help-mobile";
import assistStyles from "@/components/services-assist-mobile.module.css";
import { ServicesExplorerProvider } from "@/components/services-explorer-state";
import { ServicesCompactCatalog, ServicesCompactPanel, ServicesHomeopathyLinks } from "@/components/services-unified-catalog";
import { ServicesVideoGenerationCard } from "@/components/services-video-generation-card";
import { ServicesCoursesShelf } from "@/components/services-courses-shelf";
import { BusinessServiceBrowser } from "@/components/business-service-browser";
import { ServicesCoachTherapistMobile } from "@/components/services-coach-therapist-mobile";
import compactStyles from "@/components/services-unified-catalog.module.css";
import uniformStyles from "@/components/services-support-uniform.module.css";
import { ServicesStudioOffers } from "@/components/services-studio-offers";
import { SpiritualReadingEntry } from "@/components/services-spiritual-reading";
import { ServicesIntroMedia, ServicesMethodVideos, ServicesDirectoryInvitation } from "@/components/services-studio-extras";
import { PersonalTestimonials } from "@/components/personal-testimonials";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { wisePaymentsEnabled } from "@/lib/commerce/wise-payments";
import { personalPayPalEnabled } from "@/lib/commerce/paypal-personal";
import { publicLocales, type PublicLocale } from "@/lib/public-locales";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }>; searchParams?: Promise<{ catalog?: string; assist?: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;
// Production release marker: Wu Xing marketplace featured service.

const copy = {
  ru: {
    title: "Support — персональная поддержка · Holistic House",
    description: "Личные сессии в Торонто и онлайн. Три бесплатных способа начать: тесты, письменный анализ ситуации и символический профиль ресурсов У-Син.",
    about: "Об Андрее",
    footerTitle: "Не знаете, с чего начать?",
    footerLead: "Оставьте контакт — Андрей подскажет подходящий формат.",
    note: "Символические практики не заменяют медицинскую диагностику и лечение. Гомеопатия не имеет надёжных доказательств эффективности для лечения заболеваний; конкретные результаты не гарантируются.",
  },
  en: {
    title: "Support — personal guidance · Holistic House",
    description: "Personal sessions in Toronto or online, plus three free entry points: self-check tests, a written situation review, and a symbolic Wu Xing resource profile.",
    about: "About Andrey",
    footerTitle: "Not sure where to start?",
    footerLead: "Leave a contact — Andrey will suggest a suitable first step.",
    note: "These symbolic approaches do not replace medical assessment or treatment. Homeopathy lacks reliable evidence for treating health conditions. Individual results are not guaranteed.",
  },
  es: {
    title: "Support — apoyo personal · Holistic House",
    description: "Sesiones personales en Toronto o en línea. Comienza con una autoevaluación, una revisión gratuita de tu situación o un perfil simbólico Wu Xing.",
    about: "Sobre Andrey",
    footerTitle: "¿No sabes por dónde empezar?",
    footerLead: "Escríbenos por Telegram o WhatsApp para consultar opciones de apoyo.",
    note: "Las prácticas simbólicas no sustituyen una evaluación o tratamiento médico. La homeopatía carece de pruebas fiables de eficacia para tratar enfermedades; no se garantizan resultados.",
  },
} as const;

function isPublicServiceLocale(value: string): value is PublicLocale { return value==="ru" || value==="en" || value==="es"; }
export function generateStaticParams() { return publicLocales.map(locale => ({ locale })); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicServiceLocale(locale)) return { title: "Not found" };
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
  if (!isPublicServiceLocale(locale)) notFound();
  // Old shared links to the optional finder remain valid after moving the
  // marketplace out of Andrey's personal consultation landing.
  const query = await searchParams;
  if (query?.catalog === "1") redirect("/" + locale + "/services/catalog#service-listings");
  const current = copy[locale];
  return (
    <main className={"services-shell services-shell--studio " + assistStyles.assistPage + " " + compactStyles.page + " " + uniformStyles.page} lang={locale}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <ServicesExplorerProvider>
        {/* Four-question public entry; the original Ali dialogue stays available on explicit request. */}
        {query?.assist==="chat" ? <ServicesAssistMobile locale={locale} /> : <ServicesAssistQuiz locale={locale} />}
        <ServicesCompactCatalog locale={locale}>
          <ServicesCompactPanel id="consultation">
            <ServicesPersonalConsultationMobile locale={locale} />
            <PublicConsultationCta locale={locale} id="consultation" serviceBooking wiseEnabled={wisePaymentsEnabled()} paypalPersonalEnabled={personalPayPalEnabled()} />
          </ServicesCompactPanel>
          <ServicesCompactPanel id="homeopathy"><ServicesHomeopathyLinks locale={locale} /></ServicesCompactPanel>
          <ServicesCompactPanel id="services"><ServicesStudioOffers locale={locale} splitExtras /></ServicesCompactPanel>
          <ServicesCompactPanel id="business"><BusinessServiceBrowser locale={locale} /></ServicesCompactPanel>
          <ServicesCompactPanel id="browse"><ServicesConversionHero locale={locale} /></ServicesCompactPanel>
          <ServicesCompactPanel id="courses"><ServicesCoursesShelf locale={locale} /></ServicesCompactPanel>
          <ServicesCompactPanel id="video"><ServicesVideoGenerationCard locale={locale} /></ServicesCompactPanel>
          <ServicesCompactPanel id="coach"><ServicesCoachTherapistMobile locale={locale} /></ServicesCompactPanel>
          <ServicesCompactPanel id="reiki"><AssistReikiSession locale={locale} /></ServicesCompactPanel>
          <ServicesCompactPanel id="reading">
            <SpiritualReadingEntry locale={locale} />
            <ServicesMagicalHelpMobile locale={locale} />
          </ServicesCompactPanel>
          <ServicesCompactPanel id="about"><ServicesIntroMedia locale={locale} /></ServicesCompactPanel>
          <ServicesCompactPanel id="testimonials"><PersonalTestimonials locale={locale} variant="services" /></ServicesCompactPanel>
          <ServicesCompactPanel id="mytube"><ServicesMethodVideos locale={locale} /></ServicesCompactPanel>
          <ServicesCompactPanel id="directory">
            <ServicesDirectoryInvitation locale={locale} />
          </ServicesCompactPanel>
        </ServicesCompactCatalog>
      </ServicesExplorerProvider>
      <p className="remedy-disclaimer services-disclaimer">{current.note}</p>
    </main>
  );
}
