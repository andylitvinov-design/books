import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createArticleRepository } from "@/lib/practitioners/article-repository";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import type { PublicService } from "@/lib/practitioners/public-types";
import { CommunityServiceHighlights } from "@/components/community-service-highlights";
import Link from "next/link";
import { ArticleDirectory } from "@/components/practitioner-article-directory";
import styles from "@/components/practitioner-articles-public.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ locale: string }> };
type PublicArticle = {
  id: string;
  slug: string;
  practitionerName: string;
  practitionerSlug: string;
  publishedAt: string | null;
  published: {
    title: string;
    excerpt: string;
    coverPath?: string;
    tags?: string[];
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { robots: { index: false, follow: false } };
  return {
    metadataBase: metadataBaseFor(),
    title: locale === "ru" ? "Статьи практиков | Holistic House"
      : locale === "es" ? "Artículos de profesionales | Holistic House"
        : "Practitioner articles | Holistic House",
    description: locale === "ru"
      ? "Практические статьи и объяснения от авторов Holistic House."
      : "Educational articles and practical insights by Holistic House practitioners.",
    alternates: { canonical: "/" + locale + "/articles" },
  };
}

export default async function Articles({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const ru = locale === "ru", es = locale === "es";
  let articles: PublicArticle[] = [];
  let services: PublicService[] = [];
  const config = getAppConfig();
  const [articleResult, serviceResult] = await Promise.allSettled([
    createArticleRepository(config).publicList(locale),
    createPractitionerRepository(config).listPublicServices(locale),
  ]);
  if (articleResult.status === "fulfilled") articles = articleResult.value as PublicArticle[];
  if (serviceResult.status === "fulfilled") services = serviceResult.value as PublicService[];
  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <section className={styles.hero}>
        <p className="homeopathy-kicker">Holistic House · Journal</p>
        <h1>{ru ? "Статьи наших практиков" : es ? "Artículos de profesionales" : "Practitioner articles"}</h1>
        <p>{ru ? "Опубликованные статьи и услуги наших мастеров."
          : es ? "Artículos y servicios publicados por nuestra comunidad."
            : "Published articles and real services from our community."}</p>
        <div className={styles.authorLinks}>
          <Link href={"/" + (es ? "en" : locale) + "/app/practice?panel=materials&materialTab=articles"}>{ru ? "Написать статью" : es ? "Escribir artículo" : "Write an article"} ↗</Link>
          <Link href={"/" + (es ? "en" : locale) + "/app/practice?panel=materials&materialTab=services"}>{ru ? "Добавить услугу" : es ? "Añadir servicio" : "Add a service"} ↗</Link>
        </div>
      </section>
      {articleResult.status === "rejected" && <p className={styles.readError} role="alert">{ru ? "Статьи временно недоступны." : es ? "Los artículos no están disponibles temporalmente." : "Articles are temporarily unavailable."}</p>}
      {articles.length > 0 && <ArticleDirectory locale={locale} articles={articles.map((a) => ({
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
      <CommunityServiceHighlights locale={locale} services={services} articlesAvailable={articles.length > 0} />
      {articleResult.status === "fulfilled" && !articles.length && !services.length && <p className={styles.empty}>{ru ? "Публикации готовятся. Напишите свою статью через My Practice." : es ? "Aún no hay publicaciones aprobadas. Escribe desde My Practice." : "No approved publications yet. Submit an article through My Practice."}</p>}
    </main>
  );
}
