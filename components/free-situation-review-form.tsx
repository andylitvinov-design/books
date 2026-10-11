import type { PublicLocale } from "@/lib/public-locales";
import { FreeDrawingIntake } from "@/components/free-drawing-intake";

// The free offer is an asynchronous drawing assessment with a written report.
// Coaching answers remain browser-local until the visitor chooses to copy/send.
export function FreeSituationReviewForm({ locale }: { locale: PublicLocale }) {
  return <FreeDrawingIntake locale={locale} />;
}
