/* eslint-disable @next/next/no-img-element -- Corpus media is intentionally served from the public source route. */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Book02Reference } from "@/components/book-02-reference";
import { TranslatedReaderContent } from "@/components/translated-reader-content";
import { books, getBookById } from "@/data/library";
import { localizedBookText } from "@/data/library-localization";
import { loadReaderDocument } from "@/data/reader-content";
import { getBook02Remedies, getRemedyDirectory } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

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

export function generateStaticParams() {
  return books.map((book) => ({ bookId: book.id }));
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { bookId } = await params;
  const { lang } = await searchParams;
  const locale: Locale = lang === "en" ? "en" : "ru";
  const labels = copy[locale];
  const book = getBookById(bookId);

  if (!book) return { title: labels.missing };

  const display = localizedBookText(book, locale);
  const metadataBase = metadataBaseFor();
  const canonicalUrl = new URL("/books/" + book.id + (locale === "en" ? "?lang=en" : ""), metadataBase);
  const coverUrl = new URL("/media/" + book.mediaSeries + "/" + book.cover, metadataBase);

  return {
    metadataBase,
    title: display.title,
    description: display.description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: display.title,
      description: display.description,
      images: [{ url: coverUrl, alt: labels.cover + ": " + display.title }],
      type: "article",
    },
  };
}

export default async function BookReaderPage({ params, searchParams }: PageProps) {
  const { bookId } = await params;
  const { lang } = await searchParams;
  const locale: Locale = lang === "en" ? "en" : "ru";
  const labels = copy[locale];
  const book = getBookById(bookId);

  if (!book) notFound();

  if (book.id === "alchemy-homeopathy-remedies") {
    return <Book02Reference locale={locale} remedies={getBook02Remedies(locale)} entries={getRemedyDirectory(locale)} />;
  }

  const display = localizedBookText(book, locale);
  const document = await loadReaderDocument(book);
  const coverUrl = "/media/" + book.mediaSeries + "/" + book.cover;

  return (
    <main className="reader-shell" lang={locale}>
      <header className="reader-header">
        <div className="reader-topline">
          <Link className="reader-back-link" href={"/" + locale + "/books"}>{labels.back}</Link>
          <span className="reader-language-switch" aria-label={locale === "en" ? "Book language" : "Язык книги"}>
            <Link aria-current={locale === "ru" ? "page" : undefined} href={"/books/" + book.id}>RU</Link>
            <Link aria-current={locale === "en" ? "page" : undefined} href={"/books/" + book.id + "?lang=en"}>EN</Link>
          </span>
        </div>
        <p className="reader-eyebrow">{display.category}</p>
        <h1>{display.title}</h1>
        <p className="reader-summary">{display.description}</p>
        <dl className="reader-facts">
          <div><dt>{labels.source}</dt><dd>{locale === "en" ? display.category : book.sourceSeries}</dd></div>
          <div><dt>{labels.status}</dt><dd>{locale === "en" ? "published" : book.status}</dd></div>
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
                <li key={chapter.id}><a href={"#" + chapter.id}>{locale === "en" ? englishChapterTitle(chapter.id, index) : chapter.title}</a></li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="reader-article">
          <TranslatedReaderContent html={document.content} locale={locale} />
        </article>
      </div>
    </main>
  );
}
