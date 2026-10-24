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
    description: "Design a personal, business, wellbeing or comprehensive profile. Choose your themes and scales, adjust a free test selection and explore your private development path.",
  },
  ru: {
    title: "Профили личности · тесты, SWOT и программа развития | Holistic House",
    description: "Создайте личностный, бизнес-, ресурсный или комплексный профиль. Выберите сферы и шкалы, настройте подбор бесплатных тестов и личную программу развития.",
  },
  es: {
    title: "Perfiles personales · pruebas, DAFO y desarrollo | Holistic House",
    description: "Diseña un perfil personal, empresarial, de bienestar o integral. Elige áreas y escalas, ajusta pruebas gratuitas y explora tu plan privado de desarrollo.",
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
      title: entry.title,
      axes: [...new Set(entry.scaleGuide.measurementAxes)],
      minutes: entry.durationMinutes || null,
      questions: entry.questionCount || null,
    }));

  return (
    <main lang={locale} style={{ maxWidth: "100%", minWidth: 0, overflowX: "clip" }}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <PersonalityProfilesBuilder locale={locale} tests={tests} />
    </main>
  );
}
