import { PublicSiteHeader } from "@/components/public-site-header";
import { ServicesConversionHero } from "@/components/services-conversion-hero";
import { ServicesStudioOffers } from "@/components/services-studio-offers";
import { ServicesIntroMedia, ServicesMethodVideos, ServicesDirectoryInvitation } from "@/components/services-studio-extras";
import { PersonalTestimonials } from "@/components/personal-testimonials";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { wisePaymentsEnabled } from "@/lib/commerce/wise-payments";
import { personalPayPalEnabled } from "@/lib/commerce/paypal-personal";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata(
  "/es/services",
  "Sesiones personales y tres opciones gratuitas | Holistic House",
  "Comienza con pruebas gratuitas, una revisión escrita o Wu Xing. Sesiones personales con Andrey Litvinov en Toronto y en línea desde €50."
);

export default function SpanishServicesPage() {
  return (
    <main className="services-shell services-shell--studio" lang="es">
      <PublicSiteHeader locale="es" showAssessmentStrip={false} />
      <ServicesConversionHero locale="es" />
      <ServicesStudioOffers locale="es" />
      <ServicesIntroMedia locale="es" />
      <PersonalTestimonials locale="es" variant="services" />
      <ServicesMethodVideos locale="es" />
      <PublicConsultationCta locale="es" id="consultation" serviceBooking wiseEnabled={wisePaymentsEnabled()} paypalPersonalEnabled={personalPayPalEnabled()} />
      <ServicesDirectoryInvitation locale="es" />
      <p className="remedy-disclaimer services-disclaimer">
        La homeopatía no tiene evidencia fiable para tratar problemas de salud. Los métodos simbólicos no sustituyen la atención médica o de salud mental, incluidos los servicios urgentes. Los resultados individuales no están garantizados.
      </p>
    </main>
  );
}
