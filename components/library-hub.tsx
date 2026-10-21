import Link from "next/link";

import type { CatalogShowcaseItem } from "@/components/catalog-showcase";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import { LibraryFeed, type LibraryFeedItem } from "@/components/library-feed";
import { DaoHexagramLibrarySection } from "@/components/dao-hexagram-library-section";
import type { PublicLocale } from "@/lib/public-locales";
import { growthGuideFor } from "@/data/growth-guides";

export type LibraryView = "latest" | "books" | "videos" | "dao";

export type LibraryPublicVideo = { id: string; title: string; description: string; youtubeId: string; url: string; publishedAt: string };
export type LibraryPublicArticle = {
  id: string; slug: string; practitionerName: string; publishedAt: string | null;
  published: { title: string; excerpt: string; coverPath?: string };
};

export const libraryCopy = {
  en: {
    title: "Library",
    lead: "Books, guides and reference materials in one place.",
    latestTab: "Latest", booksTab: "Books", daoTab: "Dao reading", leadDao: "Ask the I Ching or choose one of 64 illustrated symbols.",
    leadLatest: "Fresh videos, articles and guides from Holistic House.",
    leadVideos: "Short educational videos and introductions.",
    guides: "Explore the guides",
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
    lead: "Книги, справочники и методички в одном месте.",
    latestTab: "Новое", booksTab: "Книги", daoTab: "Даосское гадание", leadDao: "Задайте вопрос или выберите один из 64 символов Книги Перемен.",
    leadLatest: "Свежие видео, статьи и методички Holistic House.",
    leadVideos: "Обучающие видео и короткие объяснения практик.",
    guides: "Справочники и методички",
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
    lead: "Libros, guías y materiales de referencia en un solo lugar.",
    latestTab: "Novedades", booksTab: "Libros", daoTab: "Oráculo taoísta", leadDao: "Haz una pregunta o elige uno de los 64 símbolos del I Ching.",
    leadLatest: "Nuevos vídeos, artículos y guías de Holistic House.",
    leadVideos: "Vídeos educativos e introducciones breves.",
    guides: "Explorar las guías",
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
      title: "Daoist Alchemy · Levels of Health",
      subtitle: "18-stage practical guide",
      description: "The author’s simple 18-stage map: restore resource, develop social expression and success, then move toward spiritual development.",
      action: "Open the guide",
    },
    ru: {
      title: "Даосская Алхимия · Уровни здоровья",
      subtitle: "Методичка · 18 ступеней",
      description: "Простая авторская карта из 18 ступеней: восстановление ресурса, проявленность и успех, затем духовное развитие.",
      action: "Открыть методичку",
    },
    es: {
      title: "Alquimia Taoísta · Niveles de salud",
      subtitle: "Guía práctica · 18 etapas",
      description: "Un mapa sencillo de 18 etapas: recuperar recurso, desarrollar expresión social y éxito, y después avanzar hacia el desarrollo espiritual.",
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
      id: "library-dao-hexagrams",
      title: locale === "ru" ? "Даосское гадание · 64 гексаграммы" : locale === "es" ? "Oráculo taoísta · 64 hexagramas" : "Daoist divination · 64 hexagrams",
      subtitle: locale === "ru" ? "Случайная карта или выбор номера" : locale === "es" ? "Pregunta o elige un número" : "Draw a card or choose a number",
      description: locale === "ru"
        ? "Вопрос, случайный символ, 12 подтверждённых авторских толкований и 64 иллюстрированные карточки в библиотеке."
        : locale === "es"
          ? "Haz una pregunta y descubre un símbolo al azar, o busca un número entre 64 tarjetas ilustradas."
          : "Ask a question, draw a random symbol or open a numbered card. All 64 illustrated entries in the Library.",
      href: `/${locale}/library?view=dao`,
      actionLabel: text.open,
      image: "/images/dao-hexagrams/post_85.jpg",
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
    { id: "library-video-homeopathy", title: "My Approach to Homeopathy", subtitle: "Approach", description: "An introduction to the place of homeopathy inside the broader Holistic House approach.", href: "/en/homeopathy", image: "/images/holistic-house/video-posters/homeopathy-en-v2.webp" },
  ],
  ru: [
    { id: "library-video-home", title: "Глубокая личная работа в Holistic House", subtitle: "Введение", description: "Короткое знакомство с атмосферой и фокусом глубокой индивидуальной работы в Holistic House.", href: "/?lang=ru", image: "/images/holistic-house/video-posters/home-ru-v1.webp" },
    { id: "library-video-services", title: "Как я выбираю подходящий метод", subtitle: "Услуги", description: "Короткое объяснение того, как формат подбирается под человека и запрос, а не под заранее выбранную технику.", href: "/ru/services", image: "/images/holistic-house/video-posters/services-ru-v1.webp" },
    { id: "library-video-homeopathy", title: "Мой подход к гомеопатии", subtitle: "Подход", description: "Введение в то, какое место гомеопатия занимает в более широкой системе Holistic House.", href: "/ru/homeopathy", image: "/images/holistic-house/video-posters/homeopathy-ru-v1.webp" },
  ],
  es: [
    { id: "library-video-about", title: "Alquimia psíquica con Andy", subtitle: "Introducción", description: "Una introducción visual al enfoque de Alquimia Psíquica y al trabajo personal en Holistic House.", href: "/es/about", image: "/images/holistic-house/video-posters/psychic-alchemy-es-v1.webp" },
  ],
};

export function LibraryBackLink({ locale }: { locale: PublicLocale }) {
  return <Link className="library-back-link" href={`/${locale}/library`}>← {libraryCopy[locale].back}</Link>;
}

const videoYouTubeIds: Record<PublicLocale, Record<string, string>> = {
  en: {
    "library-video-home": "Y4K4piEwwA8",
    "library-video-services": "s30Y42IwPcg",
    "library-video-homeopathy": "ILyRWyHtJoE",
  },
  ru: {
    "library-video-home": "AE8Pelpo424",
    "library-video-services": "Cz6SxXJNZbw",
    "library-video-homeopathy": "Q9NvYECKWuc",
  },
  es: {},
};


/** The Library and Ideas surfaces share a single published-media feed, including deduplication. */
export function buildLibraryFeedItems(
  locale: PublicLocale,
  publishedVideos: LibraryPublicVideo[] = [],
  articles: LibraryPublicArticle[] = [],
): { feedItems: LibraryFeedItem[]; guideFeed: LibraryFeedItem[] } {
  const guides = bookItems(locale);
  const publishedIds = new Set(publishedVideos.map(video => video.youtubeId));
  const publicFeed: LibraryFeedItem[] = publishedVideos.map(video => ({
    id: "owner-" + video.id, kind: "video",
    title: video.title, description: video.description,
    youtubeId: video.youtubeId, href: video.url,
    publishedAt: video.publishedAt,
  }));
  const articleFeed: LibraryFeedItem[] = articles.map(article => ({
    id: "article-" + article.id, kind: "article",
    title: article.published.title, description: article.published.excerpt,
    image: article.published.coverPath, href: "/" + locale + "/articles/" + article.slug,
    author: article.practitionerName, publishedAt: article.publishedAt || undefined,
  }));
  const siteVideoFeed: LibraryFeedItem[] = videoItemsByLocale[locale].flatMap(video => {
    const youtubeId = videoYouTubeIds[locale][video.id];
    if (youtubeId && publishedIds.has(youtubeId)) return [];
    return [{
      id: video.id, kind: "video" as const, title: video.title,
      description: video.description, image: video.image,
      youtubeId, href: youtubeId ? "https://www.youtube.com/watch?v=" + youtubeId : video.href,
    }];
  });
  const topicPictures: Record<string,string> = {
    stress: '/images/holistic-house/hero-olive-incense.webp',
    relationships: '/images/holistic-house/video-posters/constellations-en-v1.webp',
    business: '/images/holistic-house/course-focus-mountain-boy.webp',
    energy: '/academy/reiki-yggdrasil/source/eastern-tradition.png',
    effectiveness: '/images/holistic-house/video-posters/hypnotherapy-en-v1.webp',
  };
  const growthFeed: LibraryFeedItem[] = ['stress','relationships','business','energy','effectiveness'].flatMap(theme => {
    const guide = growthGuideFor(theme,locale);
    return guide ? [{
      id:'public-growth-'+theme,kind:'guide' as const,title:guide.title,
      description:guide.lead,image:topicPictures[theme],href:'/'+locale+'/explore/'+theme,
    }] : [];
  });
  const guideFeed: LibraryFeedItem[] = guides.map(guide => ({
    id: guide.id, kind: "guide", title: guide.title,
    description: guide.description, image: guide.image, href: guide.href,
  }));
  const dated = [...publicFeed, ...articleFeed].sort((a, b) =>
    (Date.parse(b.publishedAt || "") || 0) - (Date.parse(a.publishedAt || "") || 0));
  const feedItems = [...dated, ...siteVideoFeed, ...growthFeed, ...guideFeed];
  return { feedItems, guideFeed };
}

export function LibraryHub({ locale, view = "latest", publishedVideos = [], articles = [] }: {
  locale: PublicLocale;
  view?: LibraryView;
  publishedVideos?: LibraryPublicVideo[];
  articles?: LibraryPublicArticle[];
}) {
  const text = libraryCopy[locale];
  const { feedItems, guideFeed } = buildLibraryFeedItems(locale, publishedVideos, articles);

  return (
    <main className="library-shell" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <header className="library-heading">
        <h1>{text.title}</h1>
        <p>{view === "latest" ? text.leadLatest : view === "videos" ? text.leadVideos : view === "dao" ? text.leadDao : text.lead}</p>
      </header>
      <nav className="library-media-switch" aria-label={text.title}>
        <Link aria-current={view === "latest" ? "page" : undefined} href={"/" + locale + "/library"}>{text.latestTab}</Link>
        <Link aria-current={view === "videos" ? "page" : undefined} href={"/" + locale + "/library?view=videos"}>{text.videosTab}</Link>
        <Link aria-current={view === "books" ? "page" : undefined} href={"/" + locale + "/library?view=books"}>{text.booksTab}</Link>
        <Link aria-current={view === "dao" ? "page" : undefined} href={"/" + locale + "/library?view=dao"}>{text.daoTab}</Link>
      </nav>
      {view === "dao" ? <DaoHexagramLibrarySection locale={locale} /> : (
        <LibraryFeed locale={locale} items={view === "books" ? guideFeed : feedItems}
          videosOnly={view === "videos"} guidesOnly={view === "books"} />
      )}
      <p className="library-note">{text.note}</p>
      <PublicConsultationCta locale={locale} />
    </main>
  );
}
