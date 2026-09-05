"use client";

import Link from "next/link";
import Image from "next/image";
import { BookOpen, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { SiteNavigation } from "@/components/site-navigation";
import { filterLibraryBooks, getPopulatedCategories } from "@/data/library";
import type { Book } from "@/data/library";

type BookCatalogProps = {
  books: Book[];
};

const allCategoriesValue = "all";

export function BookCatalog({ books }: BookCatalogProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(allCategoriesValue);
  const deferredQuery = useDeferredValue(query);
  const categories = useMemo(() => getPopulatedCategories(books), [books]);
  const visibleBooks = useMemo(
    () => filterLibraryBooks(books, { category: activeCategory, query: deferredQuery }),
    [activeCategory, books, deferredQuery],
  );

  return (
    <main className="catalog-shell">
      <SiteNavigation />
      <header className="catalog-header">
        <div className="catalog-header-copy">
          <p className="catalog-kicker">Собрание текстов</p>
          <h1>Библиотека</h1>
          <p>
            Книги, собранные из опубликованных источников: от алхимических и даосских практик до традиции Майя.
          </p>
        </div>

        <label className="catalog-search">
          <Search aria-hidden="true" className="size-4" />
          <span className="sr-only">Поиск по библиотеке</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти книгу или главу"
            type="search"
          />
        </label>
      </header>

      <nav aria-label="Категории книг" className="catalog-filters">
        <button
          aria-pressed={activeCategory === allCategoriesValue}
          className="catalog-filter"
          onClick={() => setActiveCategory(allCategoriesValue)}
          type="button"
        >
          Все книги
        </button>
        {categories.map((category) => (
          <button
            aria-pressed={activeCategory === category}
            className="catalog-filter"
            key={category}
            onClick={() => setActiveCategory(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </nav>

      {visibleBooks.length ? (
        <section aria-label="Книги" className="catalog-grid">
          {visibleBooks.map((book, index) => (
            <Link className="catalog-card" href={`/books/${book.id}`} key={book.id}>
              <figure className="catalog-cover">
                <Image
                  alt={`Обложка: ${book.title}`}
                  height={600}
                  priority={index === 0}
                  src={`/media/${book.mediaSeries}/${book.cover}`}
                  width={800}
                />
              </figure>
              <div className="catalog-card-body">
                <p className="catalog-card-series">{book.category}</p>
                <h2>{book.title}</h2>
                <p className="catalog-card-description">{book.description}</p>
                <div className="catalog-card-footer">
                  <span>
                    <BookOpen aria-hidden="true" className="size-4" />
                    Разделов: {book.chapters.length}
                  </span>
                  <span className="catalog-card-read">Читать</span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="catalog-empty" role="status">
          <h2>Ничего не найдено</h2>
          <p>Попробуйте другое название, тег или название главы.</p>
        </section>
      )}
    </main>
  );
}
