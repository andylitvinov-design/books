import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import { createArticleRepository } from "@/lib/practitioners/article-repository";
import type { PublicPractitioner } from "@/lib/practitioners/public-types";
import { MarketplaceMasterFinder } from "@/components/master-network-explorer";
import { ArticleDirectory } from "@/components/practitioner-article-directory";
import { MentorCommunitySwitch } from "@/components/mentor-community-switch";
import { CommunityServiceHighlights } from "@/components/community-service-highlights";

type PageProps = { params: Promise<{ locale: string }>; searchParams?: Promise<{ view?: string | string[] }> };
type PublicArticle = {
  id: string;
  slug: string;
  practitionerSlug: string;
  practitionerName: string;
  publishedAt: string | null;
  published: {
    title: string;
    excerpt: string;
    coverPath?: string;
    tags?: string[];
  };
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found" };
  return {
    metadataBase: metadataBaseFor(),
    title: (locale === "ru" ? "Наставники и статьи" : locale === "es"
      ? "Mentores y artículos" : "Mentors & Articles") + " | Holistic House",
    description: locale === "ru"
      ? "Читайте статьи мастеров, знакомьтесь с их методами и выбирайте наставника."
      : locale === "es"
        ? "Lee artículos de profesionales, descubre sus enfoques y encuentra un mentor."
        : "Read practitioner articles, explore their approaches and find a mentor.",
    alternates: {
      canonical: `/${locale}/masters`,
      languages: { en: "/en/masters", ru: "/ru/masters", es: "/es/masters" },
    },
  };
}

export default async function MastersPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const requestedView = (await searchParams)?.view;
  if (!isPublicLocale(locale)) notFound();
  const ru = locale === "ru", es = locale === "es";
  let practitioners: PublicPractitioner[] = [];
  let articles: PublicArticle[] = [];
  const config = getAppConfig();
  const [mastersResult, articlesResult] = await Promise.allSettled([
    createPractitionerRepository(config).listPublicPractitioners(locale),
    createArticleRepository(config).publicList(locale),
  ]);
  if (mastersResult.status === "fulfilled") practitioners = mastersResult.value as PublicPractitioner[];
  if (articlesResult.status === "fulfilled") articles = (articlesResult.value as PublicArticle[]).slice(0, 24);
  // The existing repository returns approved public service snapshots for these practitioners.
  const services = practitioners.flatMap((practitioner) => practitioner.services || []);

  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <MentorCommunitySwitch locale={locale} initialView={requestedView === "mentors" ? "mentors" : undefined} hasArticles={articles.length > 0} hasServices={services.length > 0}
        mastersUnavailable={mastersResult.status === "rejected"}
        articlesUnavailable={articlesResult.status === "rejected"}
        mentors={<MarketplaceMasterFinder practitioners={practitioners} locale={locale} />}
        articles={<>
          {articles.length > 0 && <ArticleDirectory locale={locale} preview articles={articles.map((a) => ({
          id: a.id,
          slug: a.slug,
          practitionerName: a.practitionerName,
          practitionerSlug: a.practitionerSlug,
          publishedAt: String(a.publishedAt || ""),
          title: a.published.title,
          excerpt: a.published.excerpt,
          coverPath: a.published.coverPath || "",
          tags: Array.isArray(a.published.tags) ? a.published.tags : [],
        }))} />}
          <CommunityServiceHighlights locale={locale} services={services} articlesAvailable={articles.length > 0 || articlesResult.status === "rejected"} />
        </>}
      />
    </main>
  );
}
