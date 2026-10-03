import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Leaf } from 'lucide-react';
import { PublicSiteHeader } from '@/components/public-site-header';
import type { PublicLocale } from '@/lib/public-locales';

export const libraryCopy = {
  en: { title: 'Library', lead: 'Books and a remedy reference library, gathered in one place.', books: 'Books', bookText: 'All available books and reading materials are collected in one catalog.', browse: 'Open book catalog', remedies: 'Remedies', remedyText: 'Search the existing reference by remedy name, alias or abbreviation.', search: 'Find a remedy', back: 'Library', note: 'Reference materials are educational and do not replace medical diagnosis or treatment.' },
  ru: { title: 'Библиотека', lead: 'Книги и справочник препаратов — в одном месте.', books: 'Книги', bookText: 'Все доступные книги и материалы для чтения собраны в одном каталоге.', browse: 'Открыть каталог книг', remedies: 'Препараты', remedyText: 'Поиск по названию препарата, его вариантам и сокращениям.', search: 'Найти препарат', back: 'Библиотека', note: 'Справочные материалы носят образовательный характер и не заменяют медицинскую диагностику или лечение.' },
  es: { title: 'Biblioteca', lead: 'Libros y una biblioteca de referencia sobre remedios, en un solo lugar.', books: 'Libros', bookText: 'Todos los libros y materiales de lectura disponibles están reunidos en un solo catálogo.', browse: 'Abrir catálogo de libros', remedies: 'Remedios', remedyText: 'Busca por nombre del remedio, alias o abreviatura en la biblioteca existente.', search: 'Buscar un remedio', back: 'Biblioteca', note: 'Estos materiales son educativos y no sustituyen el diagnóstico ni el tratamiento médico.' },
} as const;

export function LibraryBackLink({ locale }: { locale: PublicLocale }) {
  return <Link className="library-back-link" href={`/${locale}/library`}>← {libraryCopy[locale].back}</Link>;
}

export function LibraryHub({ locale }: { locale: PublicLocale }) {
  const text = libraryCopy[locale];

  return <main className="library-shell" lang={locale}>
    <PublicSiteHeader locale={locale} />
    <header className="library-heading"><p className="homeopathy-kicker">Holistic House</p><h1>{text.title}</h1><p>{text.lead}</p></header>
    <section className="library-grid" aria-label={text.title}>
      <article className="library-card">
        <div className="library-card-photo"><Image src="/images/holistic-house/books-library.webp" alt="" fill sizes="(max-width: 700px) 100vw, 50vw" /></div>
        <div className="library-card-copy"><BookOpen aria-hidden="true" /><h2>{text.books}</h2><p>{text.bookText}</p>
          <Link className="library-primary" href={`/${locale}/books`}>{text.browse}<span aria-hidden="true">→</span></Link>
        </div>
      </article>
      <article className="library-card library-card--remedies">
        <div className="library-reference-art" aria-hidden="true"><Leaf /></div>
        <div className="library-card-copy"><Leaf aria-hidden="true" /><h2>{text.remedies}</h2><p>{text.remedyText}</p>
          <Link className="library-primary" href={`/${locale}/homeopathy`}>{text.search}<span aria-hidden="true">→</span></Link>
        </div>
      </article>
    </section>
    <p className="library-note">{text.note}</p>
  </main>;
}
