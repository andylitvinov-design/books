/* eslint-disable @next/next/no-img-element -- Corpus media is intentionally served from the public source route. */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { books, getBookById } from "@/data/library";
import { loadReaderDocument } from "@/data/reader-content";

type PageProps = {
  params: Promise<{ bookId: string }>;
};

type MayaBlock = {
  type: "heading" | "paragraph";
  level?: number;
  text: string;
  sourceLabel?: boolean;
  supplemental?: boolean;
};

function chapterIdForHeading(text: string, chapters: Array<{ id: string; title: string }>) {
  const normalized = text.trim().toLocaleLowerCase();
  return chapters.find((chapter) => chapter.title.toLocaleLowerCase() === normalized)?.id;
}

function MayaHeading({ block, chapterId }: { block: MayaBlock; chapterId?: string }) {
  const className = `reader-maya-heading reader-maya-heading-${block.level ?? 2}`;

  switch (block.level) {
    case 1:
      return <h1 id={chapterId} className={className}>{block.text}</h1>;
    case 3:
      return <h3 id={chapterId} className={className}>{block.text}</h3>;
    case 4:
      return <h4 id={chapterId} className={className}>{block.text}</h4>;
    case 5:
      return <h5 id={chapterId} className={className}>{block.text}</h5>;
    case 6:
      return <h6 id={chapterId} className={className}>{block.text}</h6>;
    default:
      return <h2 id={chapterId} className={className}>{block.text}</h2>;
  }
}

function MayaReader({ blocks, chapters }: { blocks: MayaBlock[]; chapters: Array<{ id: string; title: string }> }) {
  return (
    <div className="reader-content reader-maya-content" id="reader-content">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <section
              className={block.supplemental ? "reader-supplemental" : undefined}
              key={`${block.type}-${index}`}
            >
              {block.supplemental && <p className="reader-supplemental-label">Дополнительный источник TempleTherapy</p>}
              <MayaHeading block={block} chapterId={chapterIdForHeading(block.text, chapters)} />
            </section>
          );
        }

        return (
          <p className={block.sourceLabel ? "reader-source-label" : undefined} key={`${block.type}-${index}`}>
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

export function generateStaticParams() {
  return books.map((book) => ({ bookId: book.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { bookId } = await params;
  const book = getBookById(bookId);

  if (!book) return { title: "Книга не найдена" };

  const coverUrl = `/media/${book.mediaSeries}/${book.cover}`;

  return {
    title: book.title,
    description: book.description,
    alternates: { canonical: `/books/${book.id}` },
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
          {document.type === "maya" ? (
            <MayaReader blocks={document.blocks} chapters={book.chapters} />
          ) : (
            <div
              className="reader-content"
              id="reader-content"
              dangerouslySetInnerHTML={{ __html: document.content }}
            />
          )}
        </article>
      </div>
    </main>
  );
}
