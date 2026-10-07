import Link from "next/link";

import { CatalogShowcase, type CatalogShowcaseItem } from "@/components/catalog-showcase";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import type { PublicLocale } from "@/lib/public-locales";

export type LibraryView = "books" | "videos";

export const libraryCopy = {
  en: {
    title: "Library",
    lead: "Books and practical references are organized as one library: a single book catalog, the remedy reference, a distance-homeopathy guide, and the Wu Xing guide.",
    booksTab: "Books",
    videosTab: "Videos",
    sections: "Library materials",
    videos: "Videos",
    remedies: "Remedies",
    back: "Library",
    open: "Open",
    watch: "Open this video",
    note: "Reference materials are educational and do not replace medical diagnosis or treatment.",
  },
  ru: {
    title: "Библиотека",
    lead: "Книги и рабочие справочники собраны в одной библиотеке: единый каталог книг, каталог препаратов, методичка по дистанционной гомеопатии и У-Син.",
    booksTab: "Книги",
    videosTab: "Видео",
    sections: "Материалы библиотеки",
    videos: "Видео",
    remedies: "Препараты",
    back: "Библиотека",
    open: "Открыть",
    watch: "Открыть это видео",
    note: "Справочные материалы носят образовательный характер и не заменяют медицинскую диагностику или лечение.",
  },
  es: {
    title: "Biblioteca",
    lead: "Libros y referencias prácticas en una sola biblioteca: catálogo de libros, remedios, guía de homeopatía a distancia y Wu Xing.",
    booksTab: "Libros",
    videosTab: "Videos",
    sections: "Materiales de la biblioteca",
    videos: "Videos",
    remedies: "Remedios",
    back: "Biblioteca",
    open: "Abrir",
    watch: "Abrir este video",
    note: "Estos materiales son educativos y no sustituyen el diagnóstico ni el tratamiento médico.",
  },
} as const;

function bookItems(locale: PublicLocale): CatalogShowcaseItem[] {
  const text = libraryCopy[locale];
  const allBooks = {
    en: {
      title: "All books & guides",
      subtitle: "One flat catalog",
      description: "All published manuals and books in one searchable catalog. Alchemy, Dao and Maya stay as source labels rather than extra folders.",
      action: "Open book catalog",
    },
    ru: {
      title: "Все книги и методички",
      subtitle: "Единый каталог",
      description: "Все опубликованные методички и книги в одном каталоге. Алхимия, Дао и Майя остаются метками серии, а не дополнительными папками.",
      action: "Открыть каталог книг",
    },
    es: {
      title: "Todos los libros y guías",
      subtitle: "Un solo catálogo",
      description: "Todos los materiales publicados en un catálogo único. Alquimia, Dao y Maya quedan como etiquetas de origen, no como carpetas separadas.",
      action: "Abrir catálogo",
    },
  } as const;
  const wuxing = {
    en: {
      title: "Wu Xing guide",
      subtitle: "Assessment & model",
      description: "A practical guide to the five-element model, state analysis, and the author’s current working framework.",
      action: "Open Wu Xing guide",
    },
    ru: {
      title: "Методичка У-Син",
      subtitle: "Диагностика и модель",
      description: "Практическая методичка по пяти стихиям, анализу состояния и текущей авторской модели работы.",
      action: "Открыть методичку",
    },
    es: {
      title: "Guía Wu Xing",
      subtitle: "Evaluación y modelo",
      description: "Guía práctica del modelo de cinco elementos, análisis del estado y marco de trabajo del autor.",
      action: "Abrir guía",
    },
  } as const;

  return [
    {
      id: "library-books",
      title: allBooks[locale].title,
      subtitle: allBooks[locale].subtitle,
      description: allBooks[locale].description,
      href: `/${locale}/books`,
      actionLabel: allBooks[locale].action,
      image: "/images/holistic-house/books-library.webp",
    },
    {
      id: "library-remedies",
      title: text.remedies,
      subtitle: locale === "ru" ? "Гомеопатический справочник" : locale === "es" ? "Guía homeopática" : "Homeopathy reference",
      description:
        locale === "ru"
          ? "Алфавитный каталог препаратов с авторскими образовательными карточками, источниками и связанными наблюдениями."
          : locale === "es"
            ? "Catálogo alfabético de remedios con perfiles educativos, fuentes y observaciones relacionadas."
            : "An alphabetical remedy catalogue with educational profiles, sources, and related author observations.",
      href: `/${locale}/homeopathy/remedies`,
      actionLabel: text.open,
      image: "/media/remedies/arnica/message168-1.jpg",
    },
    {
      id: "library-distance-homeopathy",
      title: locale === "ru" ? "Дистанционная гомеопатия" : locale === "es" ? "Homeopatía a distancia" : "Distance homeopathy",
      subtitle: locale === "ru" ? "Как проходит работа?" : locale === "es" ? "¿Cómo funciona el proceso?" : "How does the process work?",
      description:
        locale === "ru"
          ? "Практическая памятка о двухнедельном цикле наблюдения, работе с описаниями и фотографиями препаратов, дополнительными ритуалами и повторной проверке."
          : locale === "es"
            ? "Guía práctica sobre un ciclo de observación de dos semanas, trabajo con descripciones e imágenes de remedios, prácticas opcionales y revisión posterior."
            : "A practical guide to a two-week observation cycle, remedy descriptions and images, optional reflective rituals, and follow-up review.",
      href: `/${locale}/library/distance-homeopathy`,
      actionLabel: text.open,
      image: "/images/holistic-house/distance-homeopathy.webp",
    },
    {
      id: "library-distance-homeopathy",
      title:
        locale === "ru"
          ? "Дистанционная гомеопатия"
          : locale === "es"
            ? "Homeopatía a distancia"
            : "Distance homeopathy",
      subtitle:
        locale === "ru"
          ? "Как проходит работа?"
          : locale === "es"
            ? "¿Cómo funciona el proceso?"
            : "How does the process work?",
      description:
        locale === "ru"
          ? "Практическая памятка о базовом цикле, работе с фотографиями препаратов, наблюдениях и повторной проверке."
          : locale === "es"
            ? "Guía práctica sobre el ciclo básico, el trabajo con fotografías de remedios, la observación y la revisión posterior."
            : "A practical guide to the basic cycle, remedy photographs, observation, and follow-up review.",
      href: `/${locale}/library/distance-homeopathy`,
      actionLabel: text.open,
      image: "/images/holistic-house/distance-homeopathy.webp",
    },
    {
      id: "library-wuxing",
      title: wuxing[locale].title,
      subtitle: wuxing[locale].subtitle,
      description: wuxing[locale].description,
      href: `/${locale}/wu-xing`,
      actionLabel: wuxing[locale].action,
      image: "/images/holistic-house/hero-olive-incense.webp",
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
