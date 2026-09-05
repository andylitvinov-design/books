/* eslint-disable @next/next/no-img-element -- Corpus media is intentionally served from the public source route. */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { books, getBookById } from "@/data/library";
import { loadReaderDocument } from "@/data/reader-content";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = {
  params: Promise<{ bookId: string }>;
};

export function generateStaticParams() {
  return books.map((book) => ({ bookId: book.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { bookId } = await params;
  const book = getBookById(bookId);

  if (!book) return { title: "Книга не найдена" };

  const metadataBase = metadataBaseFor();
  const canonicalUrl = new URL(`/books/${book.id}`, metadataBase);
  const coverUrl = new URL(`/media/${book.mediaSeries}/${book.cover}`, metadataBase);

  return {
    metadataBase,
    title: book.title,
    description: book.description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: book.title,
      description: book.description,
      images: [{ url: coverUrl, alt: `Обложка: ${book.title}` }],
      type: "article",
    },
  };
}

export default async function BookReaderPage({ params }: PageProps) {
  const { bookId } = await params;
  const book = getBookById(bookId);

  if (!book) notFound();

  const document = await loadReaderDocument(book);
  const coverUrl = `/media/${book.mediaSeries}/${book.cover}`;

  return (
    <main className="reader-shell">
      <header className="reader-header">
        <Link className="reader-back-link" href="/">← К библиотеке</Link>
        <p className="reader-eyebrow">{book.category}</p>
        <h1>{book.title}</h1>
        <p className="reader-summary">{book.description}</p>
        <dl className="reader-facts">
          <div><dt>Источник</dt><dd>{book.sourceSeries}</dd></div>
          <div><dt>Статус</dt><dd>{book.status}</dd></div>
        </dl>
      </header>

      <figure className="reader-cover">
        <img alt={`Обложка: ${book.title}`} src={coverUrl} />
      </figure>

      <div className="reader-layout">
        <aside className="reader-toc">
          <nav aria-label="Содержание книги">
            <p className="reader-toc-title">Содержание</p>
            <ol>
              {book.chapters.map((chapter) => (
                <li key={chapter.id}><a href={`#${chapter.id}`}>{chapter.title}</a></li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="reader-article">
          <div
            className="reader-content"
            id="reader-content"
            dangerouslySetInnerHTML={{ __html: document.content }}
          />
        </article>
      </div>
    </main>
  );
}
