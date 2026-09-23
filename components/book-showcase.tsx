import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";

import type { Book } from "@/data/library";
import type { Locale } from "@/data/remedies";

type BookShowcaseProps = {
  books: Book[];
  locale: Locale;
};

const copy = {
  ru: { chapters: "Разделов", read: "Читать", original: "Оригинальный язык книги" },
  en: { chapters: "Sections", read: "Read", original: "Book content is preserved in its source language" },
} as const;

export function BookShowcase({ books, locale }: BookShowcaseProps) {
  const text = copy[locale];
  return (
    <section className="catalog-grid remedies-book-grid" aria-label={locale === "ru" ? "Книги автора" : "Author books"}>
      {books.map((book, index) => (
        <Link className="catalog-card remedies-book-card" href={`/books/${book.id}`} key={book.id}>
          <figure className="catalog-cover">
            <Image
              alt={locale === "ru" ? `Обложка: ${book.title}` : `Cover: ${book.title}`}
              height={600}
              priority={index < 2}
              src={`/media/${book.mediaSeries}/${book.cover}`}
              width={800}
            />
          </figure>
          <div className="catalog-card-body">
            <p className="catalog-card-series">{book.category}</p>
            <h3>{book.title}</h3>
            <p className="catalog-card-description">{book.description}</p>
            {locale === "en" ? <p className="remedies-book-language-note">{text.original}</p> : null}
            <div className="catalog-card-footer">
              <span><BookOpen aria-hidden="true" className="size-4" />{text.chapters}: {book.chapters.length}</span>
              <span className="catalog-card-read">{text.read}</span>
            </div>
          </div>
        </Link>
      ))}
    </section>
  );
}
