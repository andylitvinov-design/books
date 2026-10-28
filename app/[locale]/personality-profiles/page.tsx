import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PersonalityProfilesBuilder } from "@/components/personality-profiles-builder";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { buildGuestProfileTests } from "@/lib/profile/guest-profile-tests";

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
  // until their Spanish item sets are individually licensed and verifi  const tests = buildGuestProfileTests(locale);}));

  return (
    <main lang={locale} style={{ maxWidth: "100%", minWidth: 0, overflowX: "clip" }}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <PersonalityProfilesBuilder locale={locale} tests={tests} />
    </main>
  );
}
