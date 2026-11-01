import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PersonalityProfilesBuilder } from "@/components/personality-profiles-builder";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { buildExplorerEntries } from "@/lib/assessments/test-explorer";

type Props = { params: Promise<{ locale: string }> };

const meta = {
  en: {
    title: "Personality Profiles · free tests, SWOT & development | Holistic House",
    description: "Build one evolving personal profile. Explore personality, wellbeing, relationships, career and purpose with eligible free tests and your private development path.",
  },
  ru: {
    title: "Профили личности · тесты, SWOT и программа развития | Holistic House",
    description: "Создайте единый развивающийся личный профиль. Выберите личность, самочувствие, отношения, карьеру и смыслы, пройдите подходящие тесты и сохраните цели.",
  },
  es: {
    title: "Perfiles personales · pruebas, DAFO y desarrollo | Holistic House",
    description: "Crea un único perfil personal que crece contigo. Explora personalidad, bienestar, relaciones, trabajo y propósito con pruebas gratuitas aptas.",
  },
} as const;

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { robots: { index: false } };
  return {
    metadataBase: metadataBaseFor(),
    ...meta[locale],
    alternates: {
      canonical: "/" + locale + "/personality-profiles",
      languages: {
        en: "/en/personality-profiles",
        ru: "/ru/personality-profiles",
        es: "/es/personality-profiles",
        "x-default": "/en/personality-profiles",
      },
    },
    openGraph: {
      type: "website",
      siteName: "Holistic House",
      title: meta[locale].title,
      description: meta[locale].description,
      url: "/" + locale + "/personality-profiles",
      images: [{ url: "/images/holistic-house/report-lighthouse-coast.webp", alt: "Personal development" }],
    },
  };
}

export default async function PersonalityProfilesPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();

  // Only public catalogue metadata crosses the server/client boundary.
  // No participant responses, profiles, account IDs, or health records.
  // Spanish discovery labels are translated; questionnaires remain in English
  // until their Spanish item sets are individually licensed and verified.
  const catalogueLocale = locale === "es" ? "en" : locale;
  const tests = buildExplorerEntries({ locale: catalogueLocale, audience: "guest" })
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

  return (
    <main lang={locale} style={{ maxWidth: "100%", minWidth: 0, overflowX: "clip" }}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <PersonalityProfilesBuilder locale={locale} tests={tests} />
    </main>
  );
}
