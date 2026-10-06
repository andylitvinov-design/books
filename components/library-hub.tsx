import Link from "next/link";

import { CatalogShowcase, type CatalogShowcaseItem } from "@/components/catalog-showcase";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import { bookSectionLeads, bookSectionTitles, type BookSectionKey } from "@/data/library-sections";
import type { PublicLocale } from "@/lib/public-locales";

export type LibraryView = "books" | "videos";

export const libraryCopy = {
  en: {
    title: "Library",
    lead: "Choose a section from the short overview, then scroll through each option as a visual one-screen chapter.",
    booksTab: "Books",
    videosTab: "Videos",
    sections: "Book sections",
    videos: "Videos",
    remedies: "Remedies",
    back: "Library",
    open: "Open this section",
    watch: "Open this video",
    note: "Reference materials are educational and do not replace medical diagnosis or treatment.",
  },
  ru: {
    title: "Библиотека",
    lead: "Сначала выберите раздел в кратком содержании, затем пролистайте каждый вариант как отдельный визуальный экран.",
    booksTab: "Книги",
    videosTab: "Видео",
    sections: "Разделы книг",
    videos: "Видео",
    remedies: "Препараты",
    back: "Библиотека",
    open: "Открыть этот раздел",
    watch: "Открыть это видео",
    note: "Справочные материалы носят образовательный характер и не заменяют медицинскую диагностику или лечение.",
  },
  es: {
    title: "Biblioteca",
    lead: "Elige una sección en el resumen y recorre cada opción como un capítulo visual de una pantalla.",
    booksTab: "Libros",
    videosTab: "Videos",
    sections: "Secciones de libros",
    videos: "Videos",
    remedies: "Remedios",
    back: "Biblioteca",
    open: "Abrir esta sección",
    watch: "Abrir este video",
    note: "Estos materiales son educativos y no sustituyen el diagnóstico ni el tratamiento médico.",
  },
} as const;

const sectionImages: Record<BookSectionKey, string> = {
  alchemy: "/images/holistic-house/books-library.webp",
  dao: "/images/holistic-house/hero-olive-incense.webp",
  maya: "/library/maya-mysteries/media/post-244-1.jpg",
};

const spanishSectionLeads: Record<BookSectionKey, string> = {
  alchemy: "Libros y guías de la colección Alquimia del Alma.",
  dao: "Materiales sobre tradición taoísta, alquimia, simbolismo y práctica.",
  maya: "Libros sobre las tradiciones maya y azteca, calendario, mitos y misterios.",
};

function bookItems(locale: PublicLocale): CatalogShowcaseItem[] {
  const text = libraryCopy[locale];
  const sections = (["alchemy", "dao", "maya"] as BookSectionKey[]).map((section) => ({
    id: "library-" + section,
    title: bookSectionTitles[locale][section],
    subtitle: locale === "ru" ? "Раздел библиотеки" : locale === "es" ? "Sección de biblioteca" : "Library section",
    description: locale === "es" ? spanishSectionLeads[section] : bookSectionLeads[locale][section],
    href: `/${locale}/books?section=${section}`,
    actionLabel: text.open,
    image: sectionImages[section],
  }));

  return [
    ...sections,
    {
      id: "library-remedies",
      title: text.remedies,
      subtitle: locale === "ru" ? "Гомеопатический справочник" : locale === "es" ? "Guía homeopática" : "Homeopathy reference",
      description:
        locale === "ru"
          ? "Алфавитный каталог препаратов и образовательные описания для чтения и сопоставления."
          : locale === "es"
            ? "Catálogo alfabético de remedios con materiales educativos de referencia."
            : "An alphabetical remedy catalogue with educational reference pages for reading and comparison.",
      href: `/${locale}/homeopathy`,
      actionLabel: text.open,
      image: "/media/remedies/arnica/message168-1.jpg",
    },
  ];
}

const videoItemsByLocale: Record<PublicLocale, Array<Omit<CatalogShowcaseItem, "actionLabel">>> = {
  en: [
    { id: "library-video-home", title: "Deeper Personal Work at Holistic House", subtitle: "Introduction", description: "A short introduction to the atmosphere and focus of deeper personal work at Holistic House.", href: "/en/", image: "/images/holistic-house/video-posters/home-en-v2.webp" },
    { id: "library-video-services", title: "How I Choose the Right Method", subtitle: "Services", description: "A concise explanation of how the format is chosen around the person and the question rather than a fixed technique.", href: "/en/services", image: "/images/holistic-house/video-posters/services-en-v2.webp" },
    { id: "library-video-hypnotherapy", title: "How I Work with Hypnotherapy", subtitle: "Method", description: "A short visual explanation of the hypnotherapy approach and how it fits into individual work.", href: "/en/services#methods", image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp" },
    { id: "library-video-constellations", title: "How I Work with Systemic Constellations", subtitle: "Method", description: "A short explanation of systemic constellation work and the kinds of patterns it can help explore.", href: "/en/services#methods", image: "/images/holistic-house/video-posters/constellations-en-v1.webp" },
    { id: "library-video-homeopathy", title: "My Approach to Homeopathy", subtitle: "Approach", description: "An introduction to the place of homeopathy inside the broader Holistic House approach.", href: "/en/about", image: "/images/holistic-house/video-posters/homeopathy-en-v2.webp" },
  ],
  ru: [
    { id: "library-video-home", title: "Глубокая личная работа в Holistic House", subtitle: "Введение", description: "Короткое знакомство с атмосферой и фокусом глубокой индивидуальной работы в Holistic House.", href: "/ru/", image: "/images/holistic-house/video-posters/home-ru-v1.webp" },
    { id: "library-video-services", title: "Как я выбираю подходящий метод", subtitle: "Услуги", description: "Короткое объяснение того, как формат подбирается под человека и запрос, а не под заранее выбранную технику.", href: "/ru/services", image: "/images/holistic-house/video-posters/services-ru-v1.webp" },
    { id: "library-video-homeopathy", title: "Мой подход к гомеопатии", subtitle: "Подход", description: "Введение в то, какое место гомеопатия занимает в более широкой системе Holistic House.", href: "/ru/about", image: "/images/holistic-house/video-posters/homeopathy-ru-v1.webp" },
  ],
  es: [
    { id: "library-video-about", title: "Alquimia psíquica con Andy", subtitle: "Introducción", description: "Una introducción visual al enfoque de Alquimia Psíquica y al trabajo personal en Holistic House.", href: "/es/about", image: "/images/holistic-house/video-posters/psychic-alchemy-es-v1.webp" },
  ],
};

export function LibraryBackLink({ locale }: { locale: PublicLocale }) {
  return <Link className="library-back-link" href={`/${locale}/library`}>← {libraryCopy[locale].back}</Link>;
}

export function LibraryHub({ locale, view = "books" }: { locale: PublicLocale; view?: LibraryView }) {
  const text = libraryCopy[locale];
  const items = view === "videos"
    ? videoItemsByLocale[locale].map((item) => ({ ...item, actionLabel: text.watch }))
    : bookItems(locale);

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

      <CatalogShowcase items={items} label={view === "videos" ? text.videos : text.sections} />

      <p className="library-note">{text.note}</p>
      <PublicConsultationCta locale={locale} />
    </main>
  );
}
