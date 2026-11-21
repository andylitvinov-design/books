import { PublicSiteHeader } from "@/components/public-site-header";
import { redirect } from "next/navigation";
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
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata(
  "/es/services",
  "Support — apoyo personal | Holistic House",
  "Comienza con pruebas gratuitas, una revisión escrita o Wu Xing. Sesiones personales con Andrey Litvinov en Toronto y en línea desde €50."
);

export default async function SpanishServicesPage({ searchParams }: { searchParams: Promise<{catalog?:string;assist?:string}> }) {
  const query = await searchParams;
  if (query?.catalog === "1") redirect("/es/services/catalog#service-listings");
  return (
    <main className={"services-shell services-shell--studio " + assistStyles.assistPage + " " + compactStyles.page + " " + uniformStyles.page} lang="es">
      <PublicSiteHeader locale="es" showAssessmentStrip={false} />
      <ServicesExplorerProvider>
        {/* Scenic four-step quiz by default; retain Ali when the guest explicitly chooses chat. */}
        {query?.assist==="chat" ? <ServicesAssistMobile locale="es" /> : <ServicesAssistQuiz locale="es" />}
        <ServicesCompactCatalog locale="es">
          <ServicesCompactPanel id="consultation">
            <ServicesPersonalConsultationMobile locale="es" />
            <PublicConsultationCta locale="es" id="consultation" serviceBooking wiseEnabled={wisePaymentsEnabled()} paypalPersonalEnabled={personalPayPalEnabled()} />
          </ServicesCompactPanel>
          <ServicesCompactPanel id="homeopathy"><ServicesHomeopathyLinks locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="services"><ServicesStudioOffers locale="es" splitExtras /></ServicesCompactPanel>
          <ServicesCompactPanel id="business"><BusinessServiceBrowser locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="browse"><ServicesConversionHero locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="courses"><ServicesCoursesShelf locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="video"><ServicesVideoGenerationCard locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="coach"><ServicesCoachTherapistMobile locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="reiki"><AssistReikiSession locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="reading">
            <SpiritualReadingEntry locale="es" />
            <ServicesMagicalHelpMobile locale="es" />
          </ServicesCompactPanel>
          <ServicesCompactPanel id="about"><ServicesIntroMedia locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="testimonials"><PersonalTestimonials locale="es" variant="services" /></ServicesCompactPanel>
          <ServicesCompactPanel id="mytube"><ServicesMethodVideos locale="es" /></ServicesCompactPanel>
          <ServicesCompactPanel id="directory">
            <ServicesDirectoryInvitation locale="es" />
          </ServicesCompactPanel>
        </ServicesCompactCatalog>
      </ServicesExplorerProvider>
      <p className="remedy-disclaimer services-disclaimer">
        La homeopatía no tiene evidencia fiable para tratar problemas de salud. Los métodos simbólicos no sustituyen la atención médica o de salud mental, incluidos los servicios urgentes. Los resultados individuales no están garantizados.
      </p>
    </main>
  );
}
