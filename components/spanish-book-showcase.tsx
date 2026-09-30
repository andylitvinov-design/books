import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import type { Book } from '@/data/library';
import { spanishBookText } from '@/data/spanish-books';
export function SpanishBookShowcase({ books }: { books: Book[] }) {
  return <section className="catalog-grid remedies-book-grid" aria-label="Libros del autor">
    {books.map((book, index) => {
      const copy = spanishBookText(book);
      return <a className="catalog-card remedies-book-card" href={`/books/${book.id}?lang=en`} key={book.id} target="_blank" rel="noopener noreferrer" aria-label={`${copy.title}: abrir edición original en otra pestaña`}>
        <figure className="catalog-cover"><Image alt={`Portada: ${copy.title}`} height={600} width={800} priority={index < 2} src={`/media/${book.mediaSeries}/${book.cover}`} /></figure>
        <div className="catalog-card-body"><p className="catalog-card-series">{copy.category}</p><h3>{copy.title}</h3><p className="catalog-card-description">{copy.description}</p><p className="remedies-book-language-note">Edición original: el texto del libro conserva su idioma de origen.</p><div className="catalog-card-footer"><span><BookOpen aria-hidden="true" className="size-4" />Secciones: {book.chapters.length}</span><span className="catalog-card-read">Leer original ↗</span></div></div>
      </a>;
    })}
  </section>;
}
