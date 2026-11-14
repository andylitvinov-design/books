import { PublicSiteHeader } from "@/components/public-site-header";
import { redirect } from "next/navigation";
import { ServicesConversionHero } from "@/components/services-conversion-hero";
import { ServicesAssistMobile } from "@/components/services-assist-mobile";
import { ServicesPersonalConsultationMobile } from "@/components/services-personal-consultation-mobile";
import { AssistReikiSession } from "@/components/assist-reiki-session";
import { ServicesMagicalHelpMobile } from "@/components/services-magical-help-mobile";
import assistStyles from "@/components/services-assist-mobile.module.css";
import { ServicesExplorerProvider } from "@/components/services-explorer-state";
import { ServicesCompactCatalog, ServicesCompactPanel, ServicesHomeopathyLinks } from "@/components/services-unified-catalog";
import { ServicesVideoGenerationCard } from "@/components/services-video-generation-card";
import { ServicesCoursesShelf } from "@/components/services-courses-shelf";
import { ServicesCoachTherapistMobile } from "@/components/services-coach-therapist-mobile";
import compactStyles from "@/components/services-unified-catalog.module.css";
import { ServicesStudioOffers } from "@/components/services-studio-offers";
import { SpiritualReadingEntry } from "@/components/services-spiritual-reading";
import { ServicesIntroMedia, ServicesMethodVideos, ServicesDirectoryInvitation } from "@/components/services-studio-extras";
import { PersonalTestimonials } from "@/components/personal-testimonials";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { CompactLeadCapture } from "@/components/compact-lead-capture";
import { wisePaymentsEnabled } from "@/lib/commerce/wise-payments";
import { personalPayPalEnabled } from "@/lib/commerce/paypal-personal";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata(
  "/es/services",
  "Sesiones personales y tres opciones gratuitas | Holistic House",
  "Comienza con pruebas gratuitas, una revisión escrita o Wu Xing. Sesiones personales con Andrey Litvinov en Toronto y en línea desde €50."
);

export default async function SpanishServicesPage({ searchParams }: { searchParams: Promise<{catalog?:string}> }) {
  if ((await searchParams)?.catalog === "1") redirect("/es/services/catalog#service-listings");
  return (
    <main className={"services-shell services-shell--studio " + assistStyles.assistPage + " " + compactStyles.page} lang="es">
      <PublicSiteHeader locale="es" showAssessmentStrip={false} />
      <ServicesExplorerProvider>
        {/* The original Spanish dialogue stays above the entire lower-page catalogue. */}
        <ServicesAssistMobile locale="es" />
        <div className={compactStyles.featured} data-services-featured>
          <ServicesPersonalConsultationMobile locale="es" />
        </div>
        <ServicesCompactCatalog locale="es">
          <ServicesCompactPanel id="reiki"><AssistReikiSession locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="browse"><ServicesConversionHero locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="reading"><SpiritualReadingEntry locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="consultation">
            <PublicConsultationCta locale="es" id="consultation" serviceBooking wiseEnabled={wisePaymentsEnabled()} paypalPersonalEnabled={personalPayPalEnabled()} />
          </ServicesCompactPanel>
          <ServicesCompactPanel id="services"><ServicesStudioOffers locale="es" splitExtras /></ServicesCompactPanel>
          <ServicesCompactPanel id="video"><ServicesVideoGenerationCard locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="courses"><ServicesCoursesShelf locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="coach"><ServicesCoachTherapistMobile locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="magical"><ServicesMagicalHelpMobile locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="homeopathy"><ServicesHomeopathyLinks locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="about"><ServicesIntroMedia locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="testimonials"><PersonalTestimonials locale="es" variant="services" /></ServicesCompactPanel>
          <ServicesCompactPanel id="mytube"><ServicesMethodVideos locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="directory">
            <ServicesDirectoryInvitation locale="es" />
            <CompactLeadCapture locale="es" serviceTitle="Personal service selection with Andrey"
              title="¿No sabes por dónde empezar?" lead="Deja tu contacto y Andrey te ayudará a elegir el primer paso." />
          </ServicesCompactPanel>
        </ServicesCompactCatalog>
      </ServicesExplorerProvider>
      <p className="remedy-disclaimer services-disclaimer">
        La homeopatía no tiene evidencia fiable para tratar problemas de salud. Los métodos simbólicos no sustituyen la atención médica o de salud mental, incluidos los servicios urgentes. Los resultados individuales no están garantizados.
      </p>
    </main>
  );
}
