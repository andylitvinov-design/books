import { ConsultationChoiceCapture } from "@/components/consultation-choice-capture";
import type { PublicLocale } from "@/lib/public-locales";

// Enquiry only: confirm the time, format and fee personally before any booking.
export function PersonalConsultationForm({ locale, service }: { locale: PublicLocale; service?: string }) {
  return <ConsultationChoiceCapture locale={locale} variant="service" service={service} />;
}
