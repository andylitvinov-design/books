import { EnglishGuidedMeditations } from "@/components/english-guided-meditations";
import type { PublicLocale } from "@/lib/public-locales";

// The historical so-called "English video guide" consisted largely of
// testimonials misfiled as teaching videos. Keep the public API but display
// only source-safe practice paths until actual meditation videos are verified.
export function YggdrasilEnglishVideoGuide({
  locale,
}: {
  locale: PublicLocale;
  scope?: "all" | "basic" | "instructor";
}) {
  return locale === "en" ? <EnglishGuidedMeditations focus="reiki-yggdrasil" /> : null;
}
