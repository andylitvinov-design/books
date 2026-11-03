"use client";

import Image from "next/image";
import { ArrowRight, BookOpen, ChevronLeft } from "lucide-react";

import type { Book } from "@/data/library";
import { bookSectionKeys, bookSectionTitles, type BookSectionKey } from "@/data/library-sections";
import { bookCoverArtworkUrl, hasBookCoverArtwork } from "@/lib/public-card-artwork";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./book-category-picker.module.css";

const copy = {
  ru: {
    eyebrow: "БИБЛИОТЕКА ПО ТЕМАМ",
    title: "Выберите категорию книг",
    description: "Сначала выберите направление — покажем только его книги. Или воспользуйтесь поиском выше.",
    books: "книг и материалов",
    choose: "Открыть книги категории",
    back: "Все категории",
    hint: "Выберите одну из трёх категорий, чтобы увидеть книги.",
    selected: "Открыта категория:",
  },
  en: {
    eyebrow: "EXPLORE BY COLLECTION",
    title: "Choose a book category",
    description: "Start with a collection to see its books only, or search the entire catalog above.",
    books: "books & guides",
    choose: "Open books in this category",
    back: "All categories",
    hint: "Choose one of three collections to explore its books.",
    selected: "Selected collection:",
  },
  es: {
    eyebrow: "EXPLORA POR COLECCIÓN",
    title: "Elige una categoría de libros",
    description: "Primero elige una colección para ver solo sus libros.",
    books: "libros y guías",
    choose: "Abrir libros de esta categoría",
    back: "Todas las categorías",
    hint: "Elige una de las tres colecciones para ver sus libros.",
    selected: "Colección seleccionada:",
  },
} as const;

type Props = {
  books: Book[];
  locale: PublicLocale;
  activeCategory: BookSectionKey | null;
  onSelect: (category: BookSectionKey | null) => void;
};

export function BookCategoryPicker({ books, locale, activeCategory, onSelect }: Props) {
  const text = copy[locale];

  return (
    <section id="book-collections" className={styles.root} aria-labelledby="book-collections-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}><BookOpen size={15} aria-hidden="true" />{text.eyebrow}</p>
          <h3 id="book-collections-title">{text.title}</h3>
          <p className={styles.description}>{text.description}</p>
        </div>
        {activeCategory ? (
          <button type="button" className={styles.back} onClick={() => onSelect(null)}>
            <ChevronLeft size={16} aria-hidden="true" />{text.back}
          </button>
        ) : null}
      </div>
      <div className={styles.grid}>
        {bookSectionKeys.map((category, index) => {
          const categoryBooks = books.filter(book => book.mediaSeries === category);
          const cover = categoryBooks[0];
          const title = bookSectionTitles[locale][category];
          return (
            <button
              type="button"
              key={category}
              className={styles.tile}
              data-book-category={category}
              aria-pressed={activeCategory === category}
              aria-label={`${text.choose}: ${title} (${categoryBooks.length})`}
              onClick={() => onSelect(activeCategory === category ? null : category)}
            >
              <span className={styles.art} aria-hidden="true">
                {cover ? (
                  <Image
                    alt=""
                    src={bookCoverArtworkUrl(cover.id, `/media/${cover.mediaSeries}/${cover.cover}`)}
                    width={160}
                    height={190}
                    sizes="(max-width: 720px) 74px, 92px"
                    loading="lazy"
                    unoptimized={hasBookCoverArtwork(cover.id)}
                  />
                ) : <BookOpen size={26} />}
              </span>
              <span className={styles.content}>
                <span className={styles.index}>0{index + 1} · {text.books}</span>
                <strong>{title}</strong>
                <span className={styles.count}>{categoryBooks.length} {text.books}</span>
              </span>
              <ArrowRight size={19} aria-hidden="true" className={styles.arrow} />
            </button>
          );
        })}
      </div>
      <p className={styles.status} role="status" aria-live="polite">
        {activeCategory ? `${text.selected} ${bookSectionTitles[locale][activeCategory]}` : text.hint}
      </p>
    </section>
  );
}
