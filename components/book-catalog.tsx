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
import {
  getBookMaterialRole,
  materialRoleLabel,
  readingStepLabel,
  recommendedReadingPath,
} from "@/data/library-structure";
import type { Locale } from "@/data/remedies";

type BookCatalogProps = {
  books: Book[];
  locale: Locale;
  video?: ReactNode;
};

const copy = {
  ru: {
    kicker: "Собрание текстов",
    heading: "Книги и методички",
    lead: "Все книги собраны в одном каталоге. Серия показывает происхождение материала, а метка — его роль: основы, теория, практика или справочник.",
    search: "Поиск по каталогу",
    placeholder: "Найти книгу, тему или главу",
    chapters: "Разделов",
    read: "Читать",
    authorEdition: "Авторское издание",
    featuredTitle: "Алхимия души",
    featuredDescription: "Полное авторское издание о внутреннем развитии, психогомеопатии и работе с состояниями.",
    onlineEdition: "Онлайн-издание",
    openEdition: "Открыть издание ↗",
    pathTitle: "Если не знаете, с чего начать",
    pathLead: "Короткий маршрут через базовый метод, справочник, модель состояния и практический материал.",
    emptyTitle: "Ничего не найдено",
    emptyText: "Попробуйте другое название, тег или название главы.",
  },
  en: {
    kicker: "Published collection",
    heading: "Books & guides",
    lead: "Everything is kept in one catalog. The series shows where a text comes from; the label shows whether it is a foundation, theory, practice, or reference.",
    search: "Search the catalog",
    placeholder: "Find a book, topic, or chapter",
    chapters: "Sections",
    read: "Read",
    authorEdition: "Author edition",
    featuredTitle: "The Power of Life",
    featuredDescription: "The complete author edition on inner development, psychohomeopathy, and an integrative approach to human states.",
    onlineEdition: "Online edition",
    openEdition: "Open edition ↗",
    pathTitle: "Not sure where to start?",
    pathLead: "A short route through the core method, reference material, state model, and practical work.",
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

  const pathBooks = useMemo(
    () => recommendedReadingPath.map((id) => books.find((book) => book.id === id)).filter(Boolean),
    [books],
  );

  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase();
  const featuredMatches = [
    text.featuredTitle,
    text.featuredDescription,
    text.authorEdition,
    text.onlineEdition,
  ].join(" ").toLocaleLowerCase().includes(normalizedQuery);
  const showFeatured = !normalizedQuery || featuredMatches;
  const hasResults = showFeatured || visibleBooks.length > 0;

  return (
    <main className="catalog-shell" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <LibraryBackLink locale={locale} />

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

      {!normalizedQuery ? (
        <section className="catalog-reading-path" aria-labelledby="catalog-reading-path-title">
          <div className="catalog-reading-path-heading">
            <p className="catalog-kicker">{locale === "ru" ? "Маршрут чтения" : "Reading path"}</p>
            <h2 id="catalog-reading-path-title">{text.pathTitle}</h2>
            <span>{text.pathLead}</span>
          </div>
          <div className="catalog-reading-steps">
            {pathBooks.map((book, index) => {
              if (!book) return null;
              const display = localizedBookText(book, locale);
              return (
                <Link href={"/books/" + book.id + (locale === "en" ? "?lang=en" : "")} key={book.id}>
                  <small>{readingStepLabel(locale, index)}</small>
                  <strong>{display.title}</strong>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {hasResults ? (
        <section aria-label={text.heading} className="catalog-grid">
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
                  <span><BookOpen aria-hidden="true" className="size-4" />{text.onlineEdition}</span>
                  <span className="catalog-card-read">{text.openEdition}</span>
                </div>
              </div>
            </a>
          ) : null}

          {visibleBooks.map((book, index) => {
            const display = localizedBookText(book, locale);
            const role = materialRoleLabel(locale, getBookMaterialRole(book.id));
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
                  <p className="catalog-card-series">
                    <span>{display.category}</span>
                    <span className="catalog-material-role">{role}</span>
                  </p>
                  <h2>{display.title}</h2>
                  <p className="catalog-card-description">{display.description}</p>
                  <div className="catalog-card-footer">
                    <span><BookOpen aria-hidden="true" className="size-4" />{text.chapters}: {book.chapters.length}</span>
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
