"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { LibraryBackLink } from "@/components/library-hub";
import { PublicSiteHeader } from "@/components/public-site-header";
import { featuredBookUrls } from "@/data/featured-books";
import { filterLibraryBooks } from "@/data/library";
import type { Book } from "@/data/library";
import { localizedBookText } from "@/data/library-localization";
import type { Locale } from "@/data/remedies";

type BookCatalogProps = {
  books: Book[];
  locale: Locale;
  video?: ReactNode;
};

const copy = {
  ru: {
    kicker: "Собрание текстов",
    heading: "Книги",
    lead: "Все доступные книги и материалы для чтения собраны в одном каталоге — без разделения на подкатегории.",
    search: "Поиск по каталогу",
    placeholder: "Найти книгу или главу",
    books: "Книги",
    chapters: "Разделов",
    read: "Читать",
    authorEdition: "Авторское издание",
    featuredTitle: "Алхимия души",
    featuredDescription: "Полное авторское издание о внутреннем развитии, психогомеопатии и работе с состояниями.",
    onlineEdition: "Онлайн-издание",
    openEdition: "Открыть издание ↗",
    emptyTitle: "Ничего не найдено",
    emptyText: "Попробуйте другое название, тег или название главы.",
  },
  en: {
    kicker: "Published collection",
    heading: "Books",
    lead: "All available books and reading materials are collected in one catalog, without separate subcategories.",
    search: "Search the catalog",
    placeholder: "Find a book or chapter",
    books: "Books",
    chapters: "Sections",
    read: "Read",
    authorEdition: "Author edition",
    featuredTitle: "The Power of Life",
    featuredDescription: "The complete author edition on inner development, psychohomeopathy, and an integrative approach to human states.",
    onlineEdition: "Online edition",
    openEdition: "Open edition ↗",
    emptyTitle: "Nothing found",
    emptyText: "Try another title, tag, or chapter name.",
  },
} as const;

export function BookCatalog({ books, locale, video }: BookCatalogProps) {
  const text = copy[locale];
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const visibleBooks = useMemo(
    () => filterLibraryBooks(books, { query: deferredQuery }),
    [books, deferredQuery],
  );
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase();
  const showFeatured = !normalizedQuery || [
    text.featuredTitle,
    text.featuredDescription,
    text.authorEdition,
    text.onlineEdition,
  ].join(" ").toLocaleLowerCase().includes(normalizedQuery);
  const hasResults = showFeatured || visibleBooks.length > 0;

  return (
    <main className="catalog-shell" lang={locale}>
      <PublicSiteHeader locale={locale} /><LibraryBackLink locale={locale} />
      <header className="catalog-header">
        <div className="catalog-header-copy">
          <p className="catalog-kicker">{text.kicker}</p>
          <h1>{text.heading}</h1>
          <p>{text.lead}</p>
        </div>

        <label className="catalog-search">
          <Search aria-hidden="true" className="size-4" />
          <span className="sr-only">{text.search}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={text.placeholder}
            type="search"
          />
        </label>
      </header>

      {video}

      {hasResults ? (
        <section aria-label={text.books} className="catalog-grid">
          {showFeatured ? (
            <a
              className="catalog-card"
              href={featuredBookUrls[locale]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={text.featuredTitle + ": " + text.openEdition}
            >
              <figure className="catalog-cover">
                <Image
                  alt={locale === "ru" ? "Обложка: " + text.featuredTitle : "Cover: " + text.featuredTitle}
                  height={600}
                  priority
                  src="/images/holistic-house/books-library.webp"
                  width={800}
                />
              </figure>
              <div className="catalog-card-body">
                <p className="catalog-card-series">{text.authorEdition}</p>
                <h2>{text.featuredTitle}</h2>
                <p className="catalog-card-description">{text.featuredDescription}</p>
                <div className="catalog-card-footer">
                  <span>
                    <BookOpen aria-hidden="true" className="size-4" />
                    {text.onlineEdition}
                  </span>
                  <span className="catalog-card-read">{text.openEdition}</span>
                </div>
              </div>
            </a>
          ) : null}

          {visibleBooks.map((book, index) => {
            const display = localizedBookText(book, locale);
            return (
              <Link className="catalog-card" href={"/books/" + book.id + (locale === "en" ? "?lang=en" : "")} key={book.id}>
                <figure className="catalog-cover">
                  <Image
                    alt={locale === "ru" ? "Обложка: " + display.title : "Cover: " + display.title}
                    height={600}
                    priority={!showFeatured && index === 0}
                    src={"/media/" + book.mediaSeries + "/" + book.cover}
                    width={800}
                  />
                </figure>
                <div className="catalog-card-body">
                  <p className="catalog-card-series">{display.category}</p>
                  <h2>{display.title}</h2>
                  <p className="catalog-card-description">{display.description}</p>
                  <div className="catalog-card-footer">
                    <span>
                      <BookOpen aria-hidden="true" className="size-4" />
                      {text.chapters}: {book.chapters.length}
                    </span>
                    <span className="catalog-card-read">{text.read}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      ) : (
        <section className="catalog-empty" role="status">
          <h2>{text.emptyTitle}</h2>
          <p>{text.emptyText}</p>
        </section>
      )}
    </main>
  );
}
