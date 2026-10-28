import type { PublicLocale } from "@/lib/public-locales";
import type { PublicTest } from "@/components/personality-profiles-builder";
import { buildExplorerEntries } from "@/lib/assessments/test-explorer";

// One rights-checked public guest catalogue for both profile presentations.
// Only questionnaire metadata reaches the client: never answers or account data.
export function buildGuestProfileTests(locale: PublicLocale): PublicTest[] {
  const catalogueLocale = locale === "es" ? "en" : locale;
  return buildExplorerEntries({ locale: catalogueLocale, audience: "guest" })
    .filter(entry => entry.selectable === true && entry.startable === true &&
      entry.guestEligible === true && entry.starterEligible !== false &&
      entry.free === true && entry.rightsStatus === "cleared" &&
      entry.explicitOptIn !== true && entry.scaleGuide?.measurementAxes?.length)
    .map(entry => ({
      key: entry.key,
      version: entry.definition?.version || entry.version,
      title: entry.title,
      axes: [...new Set((entry.scaleGuide.measurementAxes as unknown[])
        .filter((axis): axis is string => typeof axis === "string" && axis.length > 0))],
      minutes: entry.durationMinutes || null,
      questions: entry.questionCount || null,
      testKind: entry.testKind,
      // Catalogue interests help place a real scored axis in its appropriate topic.
      // They never change the axis or assert a different measurement.
      topics: (entry.topics || []).filter((topic: string) => typeof topic === "string" && topic.length > 0),
      // Server-declared scales only. Source-question count is published only
      // when the actual scoring items can be identified without guessing.
      scales: (entry.scaleGuide?.scales || []).filter((scale: { key: string; label: string; axis: string }) =>
        typeof scale.key === "string" && typeof scale.label === "string" &&
        typeof scale.axis === "string" &&
        entry.scaleGuide?.measurementAxes?.includes(scale.axis)).map((scale: { key: string; label: string; axis: string }) => {
        const dimensions = (entry.definition?.scoring?.dimensions || []) as Array<{ key: string; items?: string[] }>;
        const spec = dimensions.find((dim: { key: string; items?: string[] }) => dim.key === scale.key);
        const itemIds = new Set(entry.definition?.questions?.map((item: { id: string }) => item.id) || []);
        const scaleQuestions = spec?.items?.length &&
          spec.items.every((id: string) => itemIds.has(id)) ? new Set(spec.items).size :
          itemIds.has(scale.key) ? 1 : null;
        return { key: scale.key, label: scale.label, axis: scale.axis, scaleQuestions };
      }),
    }));
}
