/* eslint-disable @next/next/no-img-element -- Corpus media is intentionally served from the public source route. */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Book02Reference } from "@/components/book-02-reference";
import { PublicSiteHeader } from "@/components/public-site-header";
import { books, getBookById } from "@/data/library";
import { localizedBookText } from "@/data/library-localization";
import { loadReaderDocument } from "@/data/reader-content";
import { getBook02Remedies, getRemedyDirectory, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = {
  params: Promise<{ locale: string; bookId: string }>;
};

const copy = {
  ru: {
    notFound: "Книга не найдена",
    back: "← К библиотеке",
    source: "Источник",
    status: "Статус",
    published: "опубликовано",
    contents: "Содержание",
    contentsAria: "Содержание книги",
    cover: "Обложка",
    sourceNote: "",
  },
  en: {
    notFound: "Book not found",
    back: "← Back to library",
    source: "Collection",
    status: "Status",
    published: "published",
    contents: "Contents",
    contentsAria: "Book contents",
    cover: "Cover",
    sourceNote: "The original source text below is preserved in its source language.",
  },
} as const;

function englishChapterTitle(id: string, index: number) {
  const known: Record<string, string> = {
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
  return known[id] ?? "Section " + (index + 1);
}

export function generateStaticParams() {
  return ["ru", "en"].flatMap((locale) => books.map((book) => ({ locale, bookId: book.id })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, bookId } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const book = getBookById(bookId);
  const labels = copy[locale as Locale];

  if (!book) return { title: labels.notFound };

  const display = localizedBookText(book, locale as Locale);
  const metadataBase = metadataBaseFor();
  const canonicalUrl = new URL("/" + locale + "/books/" + book.id, metadataBase);
  const coverUrl = new URL("/media/" + book.mediaSeries + "/" + book.cover, metadataBase);

  return {
    metadataBase,
    title: display.title,
    description: display.description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ru: "/ru/books/" + book.id,
        en: "/en/books/" + book.id,
      },
    },
    openGraph: {
      title: display.title,
      description: display.description,
      images: [{ url: coverUrl, alt: labels.cover + ": " + display.title }],
      type: "article",
    },
  };
}

export default async function LocalizedBookReaderPage({ params }: PageProps) {
  const { locale, bookId } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const typedLocale = locale as Locale;
  const labels = copy[typedLocale];
  const book = getBookById(bookId);
  if (!book) notFound();

  if (book.id === "alchemy-homeopathy-remedies") {
    return <Book02Reference locale={typedLocale} remedies={getBook02Remedies(typedLocale)} entries={getRemedyDirectory(typedLocale)} />;
  }

  const display = localizedBookText(book, typedLocale);
  const document = await loadReaderDocument(book);
  const coverUrl = "/media/" + book.mediaSeries + "/" + book.cover;

  return (
    <main className="reader-shell reader-shell--localized" lang={typedLocale}>
      <PublicSiteHeader locale={typedLocale} />

      <header className="reader-header">
        <Link className="reader-back-link" href={"/" + typedLocale + "/books"}>{labels.back}</Link>
        <p className="reader-eyebrow">{display.category}</p>
        <h1>{display.title}</h1>
        <p className="reader-summary">{display.description}</p>
        <dl className="reader-facts">
          <div><dt>{labels.source}</dt><dd>{typedLocale === "en" ? display.category : book.sourceSeries}</dd></div>
          <div><dt>{labels.status}</dt><dd>{typedLocale === "en" ? labels.published : book.status}</dd></div>
        </dl>
      </header>

      <figure className="reader-cover">
        <img alt={labels.cover + ": " + display.title} src={coverUrl} />
      </figure>

      <div className="reader-layout">
        <aside className="reader-toc">
          <nav aria-label={labels.contentsAria}>
            <p className="reader-toc-title">{labels.contents}</p>
            <ol>
              {book.chapters.map((chapter, index) => (
                <li key={chapter.id}><a href={"#" + chapter.id}>{typedLocale === "en" ? englishChapterTitle(chapter.id, index) : chapter.title}</a></li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="reader-article">
          {typedLocale === "en" ? <p className="reader-source-language-note">{labels.sourceNote}</p> : null}
          <div
            className="reader-content"
            id="reader-content"
            lang="ru"
            dangerouslySetInnerHTML={{ __html: document.content }}
          />
        </article>
      </div>
    </main>
  );
}
