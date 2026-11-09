import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { MarketplaceMasterFinder } from "@/components/master-network-explorer";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import { createServiceReviewRepository } from "@/lib/practitioners/reviews";
import { createPractitionerCourseRepository } from "@/lib/practitioners/course-repository";
import type { PublicMentorCourse, PublicPractitioner } from "@/lib/practitioners/public-types";
import styles from "./page.module.css";

type PageProps = { params: Promise<{ locale: string }> };
type PublishedCourseRow = {
  slug: string;
  practitionerSlug: string;
  course: { title: string; description?: string; locale: string };
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const metadata: Record<string, { title: string; description: string }> = {
  en: {
    title: "My Coach · Find your personal coach | Holistic House",
    description: "Find a Holistic House coach by goal, method, language, format, location and price.",
  },
  ru: {
    title: "Мой коуч · Подберите специалиста | Holistic House",
    description: "Подберите персонального коуча по цели, специализации, методу, языку, формату и стоимости.",
  },
  es: {
    title: "Mi coach · Encuentra tu coach personal | Holistic House",
    description: "Encuentra un coach por objetivo, método, idioma, modalidad, ubicación y precio.",
  },
};

export function generateStaticParams() {
  return ["en", "ru", "es"].map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  return {
    metadataBase: metadataBaseFor(),
    ...metadata[locale],
    alternates: {
      canonical: `/${locale}/my-coach`,
      languages: { en: "/en/my-coach", ru: "/ru/my-coach", es: "/es/my-coach", "x-default": "/en/my-coach" },
    },
  };
}

function Hero({ locale }: { locale: string }) {
  const copy = {
    en: {
      title: "My Coach",
      lead: "Choose a coach who fits your goals, values and way of working.",
      chips: ["Stress & energy", "Relationships", "Goals & success", "Growth & meaning"],
    },
    ru: {
      title: "Мой коуч",
      lead: "Выбери специалиста под свои цели, ценности и комфортный стиль общения.",
      chips: ["Стресс и энергия", "Отношения", "Цели и успех", "Развитие и смыслы"],
    },
    es: {
      title: "Mi coach",
      lead: "Elige un profesional que encaje con tus objetivos y tu forma de trabajar.",
      chips: ["Estrés y energía", "Relaciones", "Metas y éxito", "Crecimiento y propósito"],
    },
  }[locale as "en" | "ru" | "es"];
  return (
    <section className={styles.hero} aria-labelledby="my-coach-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>HOLISTIC HOUSE · PERSONAL SUPPORT</p>
        <h1 id="my-coach-title">{copy.title}</h1>
        <p>{copy.lead}</p>
      </div>
      <div className={styles.topicPills} aria-label={locale === "ru" ? "Популярные направления" : locale === "es" ? "Temas populares" : "Popular topics"}>
        {copy.chips.map((label) => <span key={label}>{label}</span>)}
      </div>
    </section>
  );
}

export default async function MyCoachPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();

  let practitioners: PublicPractitioner[] = [];
  let courses: PublicMentorCourse[] = [];
  let config: ReturnType<typeof getAppConfig> | null = null;
  try {
    config = getAppConfig();
  } catch {
    // Public discovery must remain renderable when optional catalogue services
    // are not configured (for example, isolated preview/browser environments).
  }
  const [mastersResult, coursesResult] = await Promise.allSettled([
    Promise.resolve().then(() => {
      if (!config) throw new Error("Practitioner directory is not configured");
      return createPractitionerRepository(config).listPublicPractitioners(locale);
    }),
    Promise.resolve().then(() => {
      if (!config) throw new Error("Practitioner courses are not configured");
      return createPractitionerCourseRepository(config).catalog();
    }),
  ]);

  if (mastersResult.status === "fulfilled") {
    practitioners = mastersResult.value as PublicPractitioner[];
  }

  // Ratings are derived only from published reviews. Missing review data remains
  // unknown; it is never presented as a fabricated score.
  if (practitioners.length) {
    try {
      const summaries: { practitionerId: string; count: number; average: number }[] =
        if (!config) throw new Error("Review directory is not configured");
      const summaries: { practitionerId: string; count: number; average: number }[] =
        await createServiceReviewRepository(config)
          .listPublicSummariesForPractitioners(practitioners.map((coach) => coach.id));
      const byId = new Map(summaries.map((summary) => [
        summary.practitionerId,
        { count: summary.count, average: summary.average },
      ]));
      practitioners = practitioners.map((coach) => ({
        ...coach,
        reviewSummary: byId.get(coach.id) ?? { count: 0, average: 0 },
      }));
    } catch {
      // Keep verified public profiles visible if published review summaries are unavailable.
    }
  }

  const approvedSlugs = new Set(practitioners.map((coach) => coach.slug));
  courses = coursesResult.status === "fulfilled"
    ? (coursesResult.value as PublishedCourseRow[])
      .filter((row) => approvedSlugs.has(row.practitionerSlug)
        && ["en", "ru", "es"].includes(row.course?.locale)
        && Boolean(row.course?.title))
      .map((row) => ({
        slug: row.slug,
        practitionerSlug: row.practitionerSlug,
        title: row.course.title,
        description: row.course.description || "",
        locale: row.course.locale as PublicMentorCourse["locale"],
      }))
    : [];

  return (
    <main className={styles.page} lang={locale} data-my-coach-page>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <div className={styles.wrap}>
        <Hero locale={locale} />
        <section className={styles.finder} aria-label={locale === "ru" ? "Подбор коуча" : locale === "es" ? "Buscar coach" : "Find a coach"}>
          <MarketplaceMasterFinder
            practitioners={practitioners}
            courses={courses}
            coursesUnavailable={coursesResult.status === "rejected"}
            locale={locale}
          />
          {mastersResult.status === "rejected" && (
            <p className={styles.unavailable} role="status">
              {locale === "ru"
                ? "Каталог специалистов временно недоступен. Попробуйте обновить страницу позже."
                : locale === "es"
                  ? "El directorio no está disponible temporalmente. Inténtalo de nuevo más tarde."
                  : "The coach directory is temporarily unavailable. Please try again later."}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
