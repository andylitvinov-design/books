"use client";

import { useState } from "react";
import Image from "next/image";
import { bookCoverArtworkUrl, hasBookCoverArtwork } from "@/lib/public-card-artwork";
import { BookOpen } from "lucide-react";
import { BookCategoryPicker } from "@/components/book-category-picker";

import { featuredBookUrls } from "@/data/featured-books";
import type { Book } from "@/data/library";
import type { BookSectionKey } from "@/data/library-sections";
import { getBookMaterialRole } from "@/data/library-structure";
import { spanishBookText } from "@/data/spanish-books";

const roleLabels = { foundation: "Fundamentos", theory: "Teoría", practice: "Práctica", reference: "Referencia", project: "Guía del proyecto" } as const;

export function SpanishBookShowcase({ books }: { books: Book[] }) {
  const [activeCategory, setActiveCategory] = useState<BookSectionKey | null>(null);
  const visibleBooks = activeCategory ? books.filter(book => book.mediaSeries === activeCategory) : [];
  const showFeatured = activeCategory === "alchemy";

  return (
    <>
      <BookCategoryPicker books={books} locale="es" activeCategory={activeCategory} onSelect={setActiveCategory} />
      {activeCategory ? (
    <section className="catalog-grid remedies-book-grid" aria-label="Catálogo de libros">
      {showFeatured ? (
        <a
          className="catalog-card remedies-book-card"
          href={featuredBookUrls.en}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="The Power of Life: abrir edición inglesa en otra pestaña"
        >
          <figure className="catalog-cover">
            <Image alt="Portada: The Power of Life" height={600} width={800} priority unoptimized src="/images/holistic-house/books-library.webp" />
          </figure>
          <div className="catalog-card-body">
            <p className="catalog-card-series">Edición del autor · inglés</p>
            <h3>The Power of Life</h3>
            <p className="catalog-card-description">Edición completa del autor sobre desarrollo interior, psicohomeopatía y un enfoque integrador del trabajo con los estados humanos.</p>
            <p className="remedies-book-language-note">Edición original: inglés.</p>
            <div className="catalog-card-footer">
              <span><BookOpen aria-hidden="true" className="size-4" />Edición en línea</span>
              <span className="catalog-card-read">Abrir edición ↗</span>
            </div>
          </div>
        </a>
      ) : null}

      {visibleBooks.map((book, index) => {
        const copy = spanishBookText(book);
        return (
          <a
            className="catalog-card remedies-book-card"
            href={`/es/books/${book.id}`}
            key={book.id}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${copy.title}: abrir ficha en español`}
          >
            <figure className="catalog-cover">
              <Image alt={`Portada: ${copy.title}`} height={600} width={800} priority={index < 1 && !showFeatured} src={bookCoverArtworkUrl(book.id, `/media/${book.mediaSeries}/${book.cover}`)} unoptimized={hasBookCoverArtwork(book.id)} />
            </figure>
            <div className="catalog-card-body">
              <p className="catalog-card-series"><span>{copy.category}</span><span className="catalog-material-role">{roleLabels[getBookMaterialRole(book.id)]}</span></p>
              <h3>{copy.title}</h3>
              <p className="catalog-card-description">{copy.description}</p>
              <p className="remedies-book-language-note">Edición original: el texto del libro conserva su idioma de origen.</p>
              <div className="catalog-card-footer">
                <span><BookOpen aria-hidden="true" className="size-4" />Secciones: {book.chapters.length}</span>
                <span className="catalog-card-read">Leer original ↗</span>
              </div>
            </div>
          </a>
        );
      })}
    </section>
      ) : null}
    </>
  );
}
