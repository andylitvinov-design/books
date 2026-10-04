import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { PublicSiteHeader } from "@/components/public-site-header";
import { bookSectionTitles, type BookSectionKey } from "@/data/library-sections";
import type { PublicLocale } from "@/lib/public-locales";

export type LibraryView = "books" | "videos";

export const libraryCopy = {
  en: {
    title: "Library",
    lead: "Choose a section, then open the books or videos inside it.",
    booksTab: "Books",
    videosTab: "Videos",
    sections: "Book sections",
    videos: "Videos",
    remedies: "Remedies",
    back: "Library",
    note: "Reference materials are educational and do not replace medical diagnosis or treatment.",
  },
  ru: {
    title: "Библиотека",
    lead: "Выберите раздел, а внутри откройте нужную книгу или видео.",
    booksTab: "Книги",
    videosTab: "Видео",
    sections: "Разделы книг",
    videos: "Видео",
    remedies: "Препараты",
    back: "Библиотека",
    note: "Справочные материалы носят образовательный характер и не заменяют медицинскую диагностику или лечение.",
  },
  es: {
    title: "Biblioteca",
    lead: "Elige una sección y abre los libros o videos dentro de ella.",
    booksTab: "Libros",
    videosTab: "Videos",
    sections: "Secciones de libros",
    videos: "Videos",
    remedies: "Remedios",
    back: "Biblioteca",
    note: "Estos materiales son educativos y no sustituyen el diagnóstico ni el tratamiento médico.",
  },
} as const;

type LibraryIndexItem = {
  key: string;
  title: string;
  href: string;
  image: string;
};

const sectionImages: Record<BookSectionKey, string> = {
  alchemy: "/images/holistic-house/books-library.webp",
  dao: "/images/holistic-house/hero-olive-incense.webp",
  maya: "/library/maya-mysteries/media/post-244-1.jpg",
};

function bookItems(locale: PublicLocale): LibraryIndexItem[] {
  const sections = (["alchemy", "dao", "maya"] as BookSectionKey[]).map((section) => ({
    key: section,
    title: bookSectionTitles[locale][section],
    href: `/${locale}/books?section=${section}`,
    image: sectionImages[section],
  }));

  return [
    ...sections,
    {
      key: "remedies",
      title: libraryCopy[locale].remedies,
      href: `/${locale}/homeopathy`,
      image: "/media/remedies/arnica/message168-1.jpg",
    },
  ];
}

const videoItemsByLocale: Record<PublicLocale, LibraryIndexItem[]> = {
  en: [
    { key: "home", title: "Deeper Personal Work at Holistic House", href: "/en/", image: "/images/holistic-house/video-posters/home-en-v2.webp" },
    { key: "services", title: "How I Choose the Right Method", href: "/en/services", image: "/images/holistic-house/video-posters/services-en-v2.webp" },
    { key: "hypnotherapy", title: "How I Work with Hypnotherapy", href: "/en/services#methods", image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp" },
    { key: "constellations", title: "How I Work with Systemic Constellations", href: "/en/services#methods", image: "/images/holistic-house/video-posters/constellations-en-v1.webp" },
    { key: "homeopathy", title: "My Approach to Homeopathy", href: "/en/about", image: "/images/holistic-house/video-posters/homeopathy-en-v2.webp" },
  ],
  ru: [
    { key: "home", title: "Глубокая личная работа в Holistic House", href: "/ru/", image: "/images/holistic-house/video-posters/home-ru-v1.webp" },
    { key: "services", title: "Как я выбираю подходящий метод", href: "/ru/services", image: "/images/holistic-house/video-posters/services-ru-v1.webp" },
    { key: "homeopathy", title: "Мой подход к гомеопатии", href: "/ru/about", image: "/images/holistic-house/video-posters/homeopathy-ru-v1.webp" },
  ],
  es: [
    { key: "about", title: "Alquimia psíquica con Andy", href: "/es/about", image: "/images/holistic-house/video-posters/psychic-alchemy-es-v1.webp" },
  ],
};

export function LibraryBackLink({ locale }: { locale: PublicLocale }) {
  return <Link className="library-back-link" href={`/${locale}/library`}>← {libraryCopy[locale].back}</Link>;
}

function LibraryIndex({ items, label }: { items: LibraryIndexItem[]; label: string }) {
  return (
    <section className="library-index-grid" aria-label={label}>
      {items.map((item) => (
        <Link className="library-index-card" href={item.href} key={item.key}>
          <span className="library-index-photo">
            <Image alt="" fill sizes="(max-width: 700px) 76px, 128px" src={item.image} />
          </span>
          <span className="library-index-title">{item.title}</span>
          <ChevronRight aria-hidden="true" />
        </Link>
      ))}
    </section>
  );
}

export function LibraryHub({ locale, view = "books" }: { locale: PublicLocale; view?: LibraryView }) {
  const text = libraryCopy[locale];
  const items = view === "videos" ? videoItemsByLocale[locale] : bookItems(locale);

  return (
    <main className="library-shell" lang={locale}>
      <PublicSiteHeader locale={locale} />

      <nav className="library-media-switch" aria-label={text.title}>
        <Link aria-current={view === "videos" ? "page" : undefined} href={`/${locale}/library?view=videos`}>{text.videosTab}</Link>
        <Link aria-current={view === "books" ? "page" : undefined} href={`/${locale}/library`}>{text.booksTab}</Link>
      </nav>

      <header className="library-heading">
        <p className="homeopathy-kicker">Holistic House</p>
        <h1>{text.title}</h1>
        <p>{text.lead}</p>
      </header>

      <LibraryIndex items={items} label={view === "videos" ? text.videos : text.sections} />

      <p className="library-note">{text.note}</p>
    </main>
  );
}
