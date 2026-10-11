import { ConsultationChoiceCapture } from "@/components/consultation-choice-capture";
import type { Locale } from "@/data/remedies";

/**
 * The homepage uses the shared modern blue enquiry form.
 * The visitor explicitly chooses a paid session or free written review;
 * no request is sent before they confirm the external WhatsApp handoff.
 */
export function HomepageContactCta({ locale }: { locale: Locale }) {
  return (
    <div className="home-contact-choice" data-home-contact-capture lang={locale}>
      <ConsultationChoiceCapture
        locale={locale}
        variant="service"
        service={locale === "ru" ? "Личная консультация — Holistic House" : "Personal consultation — Holistic House"}
      />
    </div>
  );
}
