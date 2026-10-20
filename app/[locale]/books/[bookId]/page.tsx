/* eslint-disable @next/next/no-img-element -- Corpus media is intentionally served from the public source route. */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Book02Reference } from "@/components/book-02-reference";
import { BookRelatedMaterials } from "@/components/book-related-materials";
import { PageVideo } from "@/components/page-video";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { TranslatedReaderContent } from "@/components/translated-reader-content";
import { books, getBookById } from "@/data/library";
import { localizedBookText } from "@/data/library-localization";
import { spanishBookText } from "@/data/spanish-books";
import { latestAlchemyBook01Html } from "@/data/alchemy-latest-publications";
import { loadReaderDocument } from "@/data/reader-content";
import { getBook02Remedies, getRemedyDirectory } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";
import { bookSeoDescription } from "@/lib/seo-descriptions";

type PageProps = { params: Promise<{ locale: string; bookId: string }> };

const copy = {
  ru: {
    missing: "Книга не найдена",
    back: "← К библиотеке",
    source: "Источник",
    status: "Статус",
    contents: "Содержание",
    contentsAria: "Содержание книги",
    cover: "Обложка",
  },
  en: {
    missing: "Book not found",
    back: "← Back to library",
    source: "Collection",
    status: "Status",
    contents: "Contents",
    contentsAria: "Book contents",
    cover: "Cover",
  },
  es: {
    missing: "Libro no encontrado",
    back: "← Volver a los libros",
    source: "Colección",
    status: "Estado",
    contents: "Contenido",
    contentsAria: "Contenido del libro",
    cover: "Portada",
  },
} as const;

function englishChapterTitle(id: string, index: number) {
  const names: Record<string, string> = {
    introduction: "Introduction",
    principles: "Principles",
    integration: "Integration",
    practice: "Practice",
    materials: "Additional materials",
    cards: "Reference cards",
    support: "Support",
    supplements: "Supplements and minerals",
    hormones: "Hormonal support",
    oils: "Essential oils",
    herbs: "Herbs and natural carriers",
    examples: "Examples",
    application: "Application",
    method: "Method",
    observations: "Practical observations",
    basic: "Foundational profiles",
    balance: "Balance and cleansing",
    crisis: "Crisis and support",
    model: "Model",
    inputs: "Body and neurohormonal inputs",
    algorithm: "Algorithm and stages",
    matrices: "Assessment matrices",
    protocols: "Protocols",
    effects: "Effects and working notes",
    approach: "Approach",
    process: "How the work proceeds",
    services: "Service formats",
    sources: "Sources",
    path: "Path overview",
    temples: "Temples and sacred places",
    deities: "Deities and imagery",
    calendars: "Calendars and cultural context",
    miscellaneous: "Additional material",
    "inner-work": "Inner work",
    symbols: "Symbols and signs",
    rituals: "Rituals and invocations",
    request: "Question and divination",
    yijing: "Hexagrams and Yijing",
    state: "State of the person",
    elements: "Five elements",
    organs: "Organs, emotions, and correction",
    background: "Background to the model",
    storm: "Stage 1. Storm",
    "snow-queen": "Stage 2. Snow Queen",
    prometheus: "Stage 3. Prometheus",
    fortress: "Stage 4. Fortress",
    lighthouse: "Stage 5. Lighthouse",
    captain: "Stage 6. Captain",
    stream: "Stage 7. Stream",
    river: "Stage 8. River",
    cases: "Assessment and cases",
    remedies: "Remedies and notes",
    "chapter-i": "Chapter I",
    "chapter-ii": "Chapter II",
    "chapter-iii": "Chapter III",
    "chapter-iv": "Chapter IV",
    "chapter-v": "Chapter V",
    "chapter-vi": "Chapter VI",
    "chapter-vii": "Chapter VII",
  };
  return names[id] ?? "Section " + (index + 1);
}

export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return (["en", "ru", "es"] as const).flatMap(locale =>
    books.map(book => ({ locale, bookId: book.id })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { bookId, locale: requestedLocale } = await params;
  if (!["en", "ru", "es"].includes(requestedLocale)) return { title: "Not found", robots: { index: false } };
  const locale = requestedLocale as "en" | "ru" | "es";
  const labels = copy[locale];
  const book = getBookById(bookId);

  if (!book) return { title: labels.missing, robots: { index: false } };

  const display = locale === "es" ? spanishBookText(book) : localizedBookText(book, locale);
  const metadataBase = metadataBaseFor();
  const canonicalUrl = new URL(`/${locale}/books/${book.id}`, metadataBase);
  const languages = { en: `/en/books/${book.id}`, ru: `/ru/books/${book.id}`,
    es: `/es/books/${book.id}`, "x-default": `/en/books/${book.id}` };
  const coverUrl = new URL("/media/" + book.mediaSeries + "/" + book.cover, metadataBase);
  const seoDescription = bookSeoDescription(display.title, display.description, locale);

  return {
    metadataBase,
    title: display.title,
    description: seoDescription,
    alternates: { canonical: canonicalUrl, languages },
    openGraph: {
      title: display.title,
      description: seoDescription,
      images: [{ url: coverUrl, alt: labels.cover + ": " + display.title }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: display.title,
      description: seoDescription,
      images: [coverUrl],
    },
  };
}

export default async function BookReaderPage({ params }: PageProps) {
  const { bookId, locale: requestedLocale } = await params;
  if (!["en", "ru", "es"].includes(requestedLocale)) notFound();
  const locale = requestedLocale as "en" | "ru" | "es";
  const readingLocale: Locale = locale === "es" ? "ru" : locale;
  const labels = copy[locale];
  const book = getBookById(bookId);

  if (!book) notFound();

  // Spanish metadata and navigation are localized; the complete source text is not.
  if (book.id === "alchemy-homeopathy-remedies" && locale !== "es") {
    return (
      <>
        <Book02Reference locale={locale} remedies={getBook02Remedies(locale)} entries={getRemedyDirectory(locale)} video={<PageVideo slot="book-detail" locale={readingLocale} entityId={book.id} />} />
        <BookRelatedMaterials bookId={book.id} locale={locale} />
        <PublicConsultationCta locale={locale} />
      </>
    );
  }

  const display = locale === "es" ? spanishBookText(book) : localizedBookText(book, locale);
  const document = await loadReaderDocument(book);
  const sourceHtml = document.content + (book.id === "alchemy-homeopathy-foundations" ? latestAlchemyBook01Html() : "");
  // Localized header owns the sole H1; preserve the manuscript's title and anchors as H2.
  const readerHtml = sourceHtml.replace(/<h1\b([^>]*)>/gi, "<h2$1>").replace(/<\/h1\s*>/gi, "</h2>");
  const coverUrl = "/media/" + book.mediaSeries + "/" + book.cover;

  return (
    <main className="reader-shell" lang={locale}>
      <header className="reader-header">
        <div className="reader-topline">
          <Link className="reader-back-link" href={"/" + locale + "/books"}>{labels.back}</Link>
          <span className="reader-language-switch" aria-label={locale === "ru" ? "Язык книги" : locale === "es" ? "Idioma del libro" : "Book language"}>
            {(["ru", "en", "es"] as const).map(language => (
              <Link key={language} aria-current={locale === language ? "page" : undefined}
                href={`/${language}/books/${book.id}`}>{language.toUpperCase()}</Link>
            ))}
          </span>
        </div>
        <p className="reader-eyebrow">{display.category}</p>
        <h1>{display.title}</h1>
        <p className="reader-summary">{display.description}</p>
        {locale === "es" ? <p className="reader-summary">Edición original: el texto completo se conserva en ruso. El título, la descripción y la navegación están en español.</p> : null}
        <dl className="reader-facts">
          <div><dt>{labels.source}</dt><dd>{locale === "ru" ? book.sourceSeries : display.category}</dd></div>
          <div><dt>{labels.status}</dt><dd>{locale === "en" ? "published" : locale === "es" ? "Publicado" : book.status}</dd></div>
        </dl>
      </header>

      <PageVideo slot="book-detail" locale={readingLocale} entityId={book.id} />

      <figure className="reader-cover">
        <img alt={labels.cover + ": " + display.title} src={coverUrl} />
      </figure>

      <div className="reader-layout">
        <aside className="reader-toc">
          <nav aria-label={labels.contentsAria}>
            <p className="reader-toc-title">{labels.contents}</p>
            <ol>
              {book.chapters.map((chapter, index) => (
                <li key={chapter.id}><a href={"#" + chapter.id}>{locale === "en" ? englishChapterTitle(chapter.id, index) : chapter.title}</a></li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="reader-article" lang={locale === "es" ? "ru" : locale}>
          <TranslatedReaderContent html={readerHtml} locale={readingLocale} russianHref={`/ru/books/${book.id}`} />
        </article>
      </div>
      {locale !== "es" ? <BookRelatedMaterials bookId={book.id} locale={locale} /> : null}
      <PublicConsultationCta locale={locale} />
    </main>
  );
}
