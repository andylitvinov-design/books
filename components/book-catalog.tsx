"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { PublicSiteHeader } from "@/components/public-site-header";
import { filterLibraryBooks, getPopulatedCategories } from "@/data/library";
import type { Book } from "@/data/library";
import { localizedBookText } from "@/data/library-localization";
import type { Locale } from "@/data/remedies";

type BookCatalogProps = {
  books: Book[];
  locale: Locale;
};

const allCategoriesValue = "all";

const copy = {
  ru: {
    kicker: "Собрание текстов",
    heading: "Библиотека",
    lead: "Книги, собранные из опубликованных источников: от алхимических и даосских практик до традиции Майя.",
    search: "Поиск по библиотеке",
    placeholder: "Найти книгу или главу",
    filters: "Категории книг",
    all: "Все книги",
    books: "Книги",
    chapters: "Разделов",
    read: "Читать",
    emptyTitle: "Ничего не найдено",
    emptyText: "Попробуйте другое название, тег или название главы.",
  },
  en: {
    kicker: "Published collection",
    heading: "Books & Library",
    lead: "Books and reference texts on alchemical and Daoist practices, the Maya tradition, and the project’s wider body of work.",
    search: "Search the library",
    placeholder: "Find a book or chapter",
    filters: "Book categories",
    all: "All books",
    books: "Books",
    chapters: "Sections",
    read: "Read",
    emptyTitle: "Nothing found",
    emptyText: "Try another title, tag, or chapter name.",
  },
} as const;

export function BookCatalog({ books, locale }: BookCatalogProps) {
  const text = copy[locale];
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(allCategoriesValue);
  const deferredQuery = useDeferredValue(query);
  const categories = useMemo(() => getPopulatedCategories(books), [books]);
  const visibleBooks = useMemo(
    () => filterLibraryBooks(books, { category: activeCategory, query: deferredQuery }),
    [activeCategory, books, deferredQuery],
  );

  function localizedCategory(category: string) {
    const sample = books.find((book) => book.category === category);
    return sample ? localizedBookText(sample, locale).category : category;
  }

  return (
    <main className="catalog-shell" lang={locale}>
      <PublicSiteHeader locale={locale} />
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

      <nav aria-label={text.filters} className="catalog-filters">
        <button
          aria-pressed={activeCategory === allCategoriesValue}
          className="catalog-filter"
          onClick={() => setActiveCategory(allCategoriesValue)}
          type="button"
        >
          {text.all}
        </button>
        {categories.map((category) => (
          <button
            aria-pressed={activeCategory === category}
            className="catalog-filter"
            key={category}
            onClick={() => setActiveCategory(category)}
            type="button"
          >
            {localizedCategory(category)}
          </button>
        ))}
      </nav>

      {visibleBooks.length ? (
        <section aria-label={text.books} className="catalog-grid">
          {visibleBooks.map((book, index) => {
            const display = localizedBookText(book, locale);
            return (
              <Link className="catalog-card" href={"/books/" + book.id + (locale === "en" ? "?lang=en" : "")} key={book.id}>
                <figure className="catalog-cover">
                  <Image
                    alt={locale === "ru" ? "Обложка: " + display.title : "Cover: " + display.title}
                    height={600}
                    priority={index === 0}
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
