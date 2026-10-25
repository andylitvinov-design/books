import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfiHub } from "@/components/profi-hub";
import { MarketplaceMasterFinder } from "@/components/master-network-explorer";
import { getAppConfig } from "@/lib/app/config";
import { AppError } from "@/lib/assessments/contracts";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import { createPractitionerCourseRepository } from "@/lib/practitioners/course-repository";
import type { PublicMentorCourse, PublicPractitioner } from "@/lib/practitioners/public-types";
import type { PublicLocale } from "@/lib/public-locales";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
type PublishedCourseRow = {
  slug: string;
  practitionerSlug: string;
  course: { title: string; description?: string; locale: string };
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

function supported(locale: string): locale is PublicLocale {
  return locale === "en" || locale === "ru" || locale === "es";
}

const seo = {
  en: { title: "Pro | Learn Reiki & Share Your Practice", description: "Start with five free Reiki lessons, then explore three paid master programmes: Tantra Reiki, Kundalini Reiki and Reiki Yggdrasil with temple traditions. Practitioners can also offer services." },
  ru: { title: "Профи | Обучение Рейки и свои услуги", description: "Начните с пяти бесплатных уроков Рейки, затем выберите платную мастерскую программу: Тантра Рейки, Кундалини Рейки или Рейки Иггдрасиль и храмовые традиции." },
  es: { title: "Pro | Aprende Reiki y comparte tu práctica", description: "Empieza con cinco lecciones Reiki gratuitas y explora tres programas de maestría de pago: Tantra Reiki, Kundalini Reiki y Reiki Yggdrasil con tradiciones de templo." },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!supported(locale)) return { title: "Not found", robots: { index: false } };
  return {
    metadataBase: metadataBaseFor(),
    ...seo[locale],
    alternates: {
      canonical: `/${locale}/pro`,
      languages: { en: "/en/pro", ru: "/ru/pro", es: "/es/pro", "x-default": "/en/pro" },
    },
    openGraph: {
      type: "website",
      title: seo[locale].title,
      description: seo[locale].description,
      images: [{ url: "/images/holistic-house/reiki-approved-sunrise-v3.webp", alt: "Holistic House Reiki Practitioner" }],
    },
  };
}

export default async function ProfiPage({ params }: Props) {
  const { locale } = await params;
  if (!supported(locale)) notFound();
  let config: ReturnType<typeof getAppConfig>;
  try {
    config = getAppConfig();
  } catch (error) {
    // The public guide remains usable when its optional directory is unavailable.
    // Private app configuration and authentication still fail closed unchanged.
    if (!(error instanceof AppError) || error.code !== "APP_UNAVAILABLE") throw error;
    return <ProfiHub locale={locale} directory={null} directoryUnavailable />;
  }
  const [mastersResult, coursesResult] = await Promise.allSettled([
    createPractitionerRepository(config).listPublicPractitioners(locale),
    createPractitionerCourseRepository(config).catalog(),
  ]);
  const practitioners: PublicPractitioner[] = mastersResult.status === "fulfilled"
    ? mastersResult.value : [];
  const approvedSlugs = new Set(practitioners.map((master) => master.slug));
  const courses: PublicMentorCourse[] = coursesResult.status === "fulfilled"
    ? (coursesResult.value as PublishedCourseRow[])
      .filter((row) => approvedSlugs.has(row.practitionerSlug) &&
        ["en", "ru", "es"].includes(row.course?.locale) && Boolean(row.course?.title))
      .map((row) => ({
        slug: row.slug,
        practitionerSlug: row.practitionerSlug,
        title: row.course.title,
        description: row.course.description || "",
        locale: row.course.locale as PublicMentorCourse["locale"],
      })) : [];
  return <ProfiHub locale={locale}
    directory={mastersResult.status === "fulfilled"
      ? <MarketplaceMasterFinder practitioners={practitioners} courses={courses}
          coursesUnavailable={coursesResult.status === "rejected"} locale={locale} embedded />
      : null}
    directoryUnavailable={mastersResult.status === "rejected"} />;
}
