import { ConsultationChoiceCapture } from "@/components/consultation-choice-capture";
import type { PublicLocale } from "@/lib/public-locales";

// A named paid service offers session/free-introduction/fees; the About page
// starts with personal topics instead. Neither path requires a long intake form.
export function PersonalConsultationForm({ locale, service }: { locale: PublicLocale; service?: string }) {
  return <ConsultationChoiceCapture locale={locale} variant={service ? "service" : "personal"} service={service} />;
}
