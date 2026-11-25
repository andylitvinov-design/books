import type { PublicLocale } from "@/lib/public-locales";
import { FreeDrawingIntake } from "@/components/free-drawing-intake";

// The free offer is an asynchronous drawing assessment with a written report.
// Reuse the private questionnaire instead of collecting duplicate answers.
export function FreeSituationReviewForm({ locale }: { locale: PublicLocale }) {
  return <FreeDrawingIntake locale={locale} />;
}
