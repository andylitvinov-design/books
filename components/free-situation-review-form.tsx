import type { PublicLocale } from "@/lib/public-locales";
import { ConsultationChoiceCapture } from "@/components/consultation-choice-capture";

// No mandatory name, private history or situation field on first contact.
// This preserves the approved free-introduction route and its ?topic= deep links.
export function FreeSituationReviewForm({ locale }: { locale: PublicLocale }) {
  return <ConsultationChoiceCapture locale={locale} variant="free" />;
}
