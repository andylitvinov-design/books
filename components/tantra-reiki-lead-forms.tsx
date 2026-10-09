import { ReikiChoiceCapture } from "@/components/reiki-choice-capture";
import type { PublicLocale } from "@/lib/public-locales";

// Shared small blue selector replaces the former long Master Course intake form.
// The #tantra-next-steps and #tantra-master-course anchors remain available.
export function TantraReikiLeadForms({ locale }: { locale: PublicLocale }) {
  return <ReikiChoiceCapture locale={locale} course="tantra" />;
}
