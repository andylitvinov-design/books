import Link from "next/link";

import type { CatalogShowcaseItem } from "@/components/catalog-showcase";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import { LibraryFeed, type LibraryFeedItem } from "@/components/library-feed";
import { DaoHexagramLibrarySection } from "@/components/dao-hexagram-library-section";
import type { PublicLocale } from "@/lib/public-locales";
import { growthGuideFor } from "@/data/growth-guides";
import { greekVideoSeries } from "@/data/academy/greek-video-series";
import { freeMeditationVideos } from "@/data/academy/holistic-support-meditations";
import psimasterMedia from "@/data/academy/psimaster-media.generated.json";
import psimasterOwnerApproval from "@/data/academy/psimaster-mytube-owner-approval-20261112.json";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import { academyDisplayTitle, mediaForRecord, preferredAcademyRecords, youtubeIdFromUrl } from "@/data/academy/catalog";
import { VideoDiscovery } from "@/components/video-discovery";
import { buildPublishedVideoIndex } from "@/lib/video-discovery/catalog.mjs";
import { classifyMyTubeFormat } from "@/lib/video-discovery/mytube-duration.mjs";
import { rankPublicMyTubeVideo } from "@/lib/mandala/mytube-video-tagging.mjs";
import { listMyTubeCategories } from "@/lib/mandala/mytube-content-taxonomy.mjs";

export type LibraryView = "latest" | "books" | "videos" | "dao";

export type LibraryPublicVideo = { id: string; title: string; description: string; youtubeId: string; url: string; publishedAt: string; locale?: PublicLocale };
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
      subtitle: "Browse by collection",
      description: "Choose a tradition — Alchemy, Dao, Maya, Egypt, Greece, Rome, or Zoroastrian studies — or search the catalog.",
      action: "Open book catalog",
    },
    ru: {
      title: "Все книги и методички",
      subtitle: "Книги по категориям",
      description: "Выберите направление: Алхимия души, Дао, Майя, Египет, Греция, Рим или Зороастризм. Поиск работает по всему каталогу.",
      action: "Открыть каталог книг",
    },
    es: {
      title: "Todos los libros y guías",
      subtitle: "Libros por categoría",
      description: "Elige Alquimia, Tao, Maya, Egipto, Grecia, Roma o Zoroastrismo, o busca en todo el catálogo.",
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
      id: "library-temple-attunements",
      title: locale === "ru" ? "Настройки древних традиций" : locale === "es" ? "Sintonizaciones de tradiciones antiguas" : "Ancient tradition attunements",
      subtitle: locale === "ru" ? "Отдельная картотека · божества и места силы" : locale === "es" ? "Fichas por tradición y deidad" : "Separate card index · deities and places",
      description: locale === "ru"
        ? "Майя, Греция, Египет и другие традиции: фильтр по культуре, каналу или божеству; отдельные оригинальные стихи, контекст и подтверждённые иллюстрации."
        : locale === "es"
          ? "Busca por tradición, deidad, canal y lugar. Versos originales con fuentes e imágenes comprobadas cuando están disponibles."
          : "Browse Maya, Greek, Egyptian and other traditions by deity, channel and place. Original author-written verses, sources and verified images.",
      href: `/${locale}/temple-channels`,
      actionLabel: text.open,
      image: "/images/holistic-house/hero-olive-incense.webp",
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
    { id: "library-video-psychotherapy", title: "Psychotherapy — introduction in English", subtitle: "Method", description: "An introduction to imagery psychotherapy and the individual working approach.", href: "/en/services#methods", image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp" },
    { id: "library-video-business-constellations", title: "Business Constellations", subtitle: "Method", description: "A published introduction to systemic business constellations.", href: "/en/services#methods", image: "/images/holistic-house/andy-about.png" },
  ],
  ru: [
    { id: "library-video-home", title: "Глубокая личная работа в Holistic House", subtitle: "Введение", description: "Короткое знакомство с атмосферой и фокусом глубокой индивидуальной работы в Holistic House.", href: "/?lang=ru", image: "/images/holistic-house/video-posters/home-ru-v1.webp" },
    { id: "library-video-services", title: "Как я выбираю подходящий метод", subtitle: "Услуги", description: "Короткое объяснение того, как формат подбирается под человека и запрос, а не под заранее выбранную технику.", href: "/ru/services", image: "/images/holistic-house/video-posters/services-ru-v1.webp" },
    { id: "library-video-homeopathy", title: "Мой подход к гомеопатии", subtitle: "Подход", description: "Введение в то, какое место гомеопатия занимает в более широкой системе Holistic House.", href: "/ru/homeopathy", image: "/images/holistic-house/video-posters/homeopathy-ru-v1.webp" },
    { id: "library-video-psychotherapy", title: "Образная психотерапия — видео о подходе", subtitle: "Метод", description: "Знакомство с образной психотерапией и индивидуальной работой.", href: "/ru/services#methods", image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp" },
  ],
  es: [
    { id: "library-video-about", title: "Alquimia psíquica con Andy", subtitle: "Introducción", description: "Una introducción visual al enfoque de Alquimia Psíquica y al trabajo personal en Holistic House.", href: "/es/about", image: "/images/holistic-house/video-posters/psychic-alchemy-es-v1.webp" },
  ],
};


// Source-backed discovery indexes reuse the verified Academy manifests, never private videos.
// Original-language teaching records are shared across EN/RU/ES discovery; never dubbed.
const discoveryTags: Record<string,string[]>={
  "tantra-reiki":["relationships","energy","practices"],
  "reiki/master-shamanic-healing":["energy","meaning","practices"],
  "reiki/yggdrasil/faq":["energy","meaning","practices"],
  "mysteries/archetypes-of-gods":["relationships","meaning","practices"],
  "mysteries/guidance-of-gods":["meaning","practices"],
  "symbolic/artifacts-talismans":["meaning","practices"],
  "reiki-yggdrasil":["energy","meaning","practices"],
  "kundalini-reiki":["energy","practices"],
  "videos/greek-mysteries-dionysus":["relationships","meaning","practices"],
  "videos/greek-mysteries-demeter":["relationships","meaning","practices"],
  "videos/egypt-osiris":["meaning","practices"],
  "videos/maya-archetypes":["meaning","practices"],
  "videos/planetary-power":["energy","practices"],
  "videos/strength-protection":["stress","energy","practices"],
  "videos/energy-pump-ups":["energy","practices"],
  "videos/sun-meditations":["meaning","energy","practices"],
};
function approvedAcademyDiscoveryVideos():LibraryFeedItem[]{
  const english:LibraryFeedItem[]=englishGuidedMeditations.flatMap(video=>{
    // Do not promote Sun Flight until the original recorded playback is verified.
    if(video.key==="flight-to-sun" || !video.youtubeId || !/^[A-Za-z0-9_-]{11}$/.test(video.youtubeId))return [];
    return [{
      id:"academy-en-"+video.key,kind:"video" as const,title:video.title,
      description:video.description,image:video.image,youtubeId:video.youtubeId,
      href:"https://www.youtube.com/watch?v="+video.youtubeId,
      sourceLabel:"Academy · EN",sourceGroup:video.key,
      audioLanguage:"en" as const,curation:"verified" as const,
      topicTags:discoveryTags[video.key]||["practices"],
    }];
  });
  // Source language is independent of the language of the MyTube controls.
  // Include only already verified public embeds from educational programmes.
  // Historical festivals, testimonials, and unreviewed links stay excluded.
  const archive:LibraryFeedItem[]=(["ru","en"] as const)
    .flatMap(sourceLocale=>preferredAcademyRecords(sourceLocale,record=>
      record.sourceLocale===sourceLocale&&
      ["videos","reiki","mysteries","symbolic"].includes(record.direction)))
    .filter(record=>record.status!=="needs_review")
    .flatMap(record=>mediaForRecord(record)
      .filter(media=>media.status==="verified_legacy_public_embed")
      .sort((a,b)=>(a.order??Number.MAX_SAFE_INTEGER)-(b.order??Number.MAX_SAFE_INTEGER))
      .flatMap(media=>{
        const youtubeId=youtubeIdFromUrl(media.mediaUrl);
        if(!youtubeId||!/^[A-Za-z0-9_-]{11}$/.test(youtubeId))return [];
        const sourceLocale=record.sourceLocale;
        return [{
          id:"academy-"+sourceLocale+"-"+record.logicalId+"-"+youtubeId,kind:"video" as const,
          title:(sourceLocale==="en"?media.lessonTitleEn:media.lessonTitle)||
            media.lessonTitle||academyDisplayTitle(record,sourceLocale),
          description:academyDisplayTitle(record,sourceLocale),youtubeId,
          href:"https://www.youtube.com/watch?v="+youtubeId,
          sourceLabel:record.sourceProvider==="psimaster"?"PsiMaster · архив":"PsiTrends · archive",
          sourceGroup:record.logicalId,audioLanguage:sourceLocale,
           mytubeLessonOrder:Number.isInteger(media.order)?media.order:undefined,
          curation:"verified" as const,
          topicTags:discoveryTags[record.logicalId]||["practices"],
        }];
      }));
  return [...english,...archive];
}

export function LibraryBackLink({ locale }: { locale: PublicLocale }) {
  return <Link className="library-back-link" href={`/${locale}/library`}>← {libraryCopy[locale].back}</Link>;
}

const videoYouTubeIds: Record<PublicLocale, Record<string, string>> = {
  en: {
    "library-video-home": "Y4K4piEwwA8",
    "library-video-services": "s30Y42IwPcg",
    "library-video-homeopathy": "ILyRWyHtJoE",
    "library-video-psychotherapy": "vqRmI79cecQ",
    "library-video-business-constellations": "sfVFOQNr2qk",
  },
  ru: {
    "library-video-home": "AE8Pelpo424",
    "library-video-services": "Cz6SxXJNZbw",
    "library-video-homeopathy": "Q9NvYECKWuc",
    "library-video-psychotherapy": "eLsjFaKCBhI",
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
    audioLanguage: video.locale, sourceLabel: "Holistic House",
    curation: "published", sourceApproved: true, sourceGroup: "owner-library",
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
      curation: "published" as const, sourceApproved: true, sourceGroup: "site-introduction",
    }];
  });
  const topicPictures: Record<string,string> = {
    "goals-money": '/images/holistic-house/course-focus-mountain-boy.webp',
    "love-relationships": '/images/holistic-house/video-posters/constellations-en-v1.webp',
    "energy-confidence": '/academy/reiki-yggdrasil/source/eastern-tradition.png',
    "stress-anxiety": '/images/holistic-house/hero-olive-incense.webp',
  };
  // Canonical four directions, while preserving each existing public SEO route.
  const categoryRoute: Record<string,string> = {
    "goals-money":"business",
    "love-relationships":"love",
    "energy-confidence":"energy",
    "stress-anxiety":"stress",
  };
  const growthFeed: LibraryFeedItem[] = listMyTubeCategories(locale).flatMap(category => {
    const route=categoryRoute[category.id];
    const guideKey=route==="love"?"relationships":route;
    const guide=growthGuideFor(guideKey,locale);
    return guide ? [{
      id:'public-growth-'+category.id,kind:'guide' as const,title:category.label,
      description:guide.lead,image:topicPictures[category.id],
      href:'/'+locale+'/explore/'+route,
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

/** Shared public-only video source for Library and MyTube; no second catalog. */
export function buildPublicVideoDiscoveryItems(
  locale: PublicLocale,
  publishedVideos: LibraryPublicVideo[] = [],
  approvedMeditations: LibraryFeedItem[] = [],
): LibraryFeedItem[] {
  const {feedItems}=buildLibraryFeedItems(locale,publishedVideos,[]);
  // Existing owner-approved site introductions are displayed in their ORIGINAL
  // audio language on every interface locale; never pretend they were dubbed.
  const siteIntroductions:LibraryFeedItem[]=(["ru","en"] as const).flatMap(audioLanguage=>
    videoItemsByLocale[audioLanguage].flatMap(video=>{
      const youtubeId=videoYouTubeIds[audioLanguage][video.id];
      if(!youtubeId||!/^[A-Za-z0-9_-]{11}$/.test(youtubeId))return [];
      return [{
        id:"site-"+audioLanguage+"-"+video.id,kind:"video" as const,
        title:video.title,description:video.description,image:video.image,youtubeId,
        href:"https://www.youtube.com/watch?v="+youtubeId,
        audioLanguage,curation:"published" as const,sourceApproved:true,
        sourceLabel:"Holistic House · "+audioLanguage.toUpperCase(),
        sourceGroup:"site-introduction",
      }];
    }));
  // Publicly registered owner presentations already appear on the Services
  // and other landing pages. Their verified YouTube IDs, not vague titles or
  // arbitrary owner uploads, identify the existing Masters shelf.
  const approvedSiteMasterIds=new Set(siteIntroductions.map(video=>video.youtubeId));
  // Russian numbered teaching series are playable on EN/ES MyTube too.
  const seriesItems:LibraryFeedItem[]=greekVideoSeries("ru")
    .flatMap(series=>series.lessons.map(lesson=>({
      id:"source-series-"+series.id+"-"+lesson.id,kind:"video" as const,
      title:lesson.title,
      description:series.title+" · "+
        (locale==="ru"?"выпуск":locale==="es"?"episodio":"episode")+" "+
        lesson.order+" / "+series.lessons.length,
      youtubeId:lesson.id,href:"https://www.youtube.com/watch?v="+lesson.id,
      seriesId: series.id,seriesTitle:series.title,
      seriesOrder: lesson.order,seriesHref:series.href,
      audioLanguage:"ru" as const,curation:"verified" as const,
      sourceLabel:"PsiMaster · архив",sourceGroup:series.logicalId,
      topicTags:discoveryTags[series.logicalId]||["practices"],
    })));
  // These already-public ORIGINAL PsiMaster recordings are source-verified
  // legacy YouTube embeds from the Academy manifest, not the independent
  // candidate-only Supabase short-meditation table. Preserve original RU audio.
  // Playback duration is not verified: never assert that these are under 10m.
  // The "Online Energy-Practice Marathons" introduction is not a meditation.
  const ownerApprovedIds=new Set(psimasterOwnerApproval.youtubeIds);
  const curatedMeditations=freeMeditationVideos("ru")
    .filter(video=>video.id!=="95peObUizeE"&&ownerApprovedIds.has(video.id));
  const curatedIds=new Set(curatedMeditations.map(video=>video.id));
  // Restore the entire original "Planetary Power" meditation cycle, including
  // Mars, Mercury, Jupiter, Saturn, the money circle and the Sun. Several
  // recordings also occur in the curated selection: keep exactly one per ID.
  const planetaryMeditations=psimasterMedia
    .filter(media=>media.logicalId==="videos/planetary-power"&&
      media.status==="verified_legacy_public_embed"&&ownerApprovedIds.has(media.videoId)&&
      /^[A-Za-z0-9_-]{11}$/.test(media.videoId)&&!curatedIds.has(media.videoId))
    .sort((a,b)=>a.order-b.order)
    .map(media=>({
      id:media.videoId,title:media.lessonTitle,
      description:"Сила планет · оригинальная медитация из архива PsiMaster",
    }));
  const originalPsiMasterPractices:LibraryFeedItem[]=[
    ...curatedMeditations,...planetaryMeditations,
  ].map(video=>({
    id:"psimaster-practice-"+video.id,kind:"video" as const,
    title:video.title,description:video.description||"",
    youtubeId:video.id,href:"https://www.youtube.com/watch?v="+video.id,
    audioLanguage:"ru" as const,curation:"verified" as const,
    sourceApproved:true,sourceLabel:"PsiMaster · архив",
    sourceGroup:"psimaster-original-meditations",
    contentType:video.id==="ZYGjw0PtvdM"?"energy_boost_practice":"soft_meditation",
    topicTags:["energy","practices"],
  }));
  // One canonical public index, de-duplicated by YouTube ID. Unknown, private,
  // draft and unapproved clips never gain publication rights from this merge.
  return buildPublishedVideoIndex([
    ...originalPsiMasterPractices,
    ...siteIntroductions,
    ...seriesItems,
    ...approvedAcademyDiscoveryVideos(),
    ...approvedMeditations,
    ...feedItems.filter(item=>item.kind==="video"&&item.sourceGroup!=="site-introduction"),
  ]).map(video=>({...video,mytubeFormat:classifyMyTubeFormat(video),
    ...rankPublicMyTubeVideo(video,{locale}),
    // Mark AFTER YouTube-ID deduplication: a merged duplicate must retain its
    // existing source approval, and must never move a course/meditation here.
    ...(approvedSiteMasterIds.has(video.youtubeId)&&video.sourceApproved===true&&
      !video.seriesId&&!Number.isInteger(video.seriesOrder)&&
      !Number.isInteger(video.mytubeLessonOrder)
      ?{mytubeSection:"masters" as const,author:"Andy"}:{}),
  }));
}

export function LibraryHub({ locale, view = "latest", publishedVideos = [], articles = [], approvedMeditations = [] }: {
  locale: PublicLocale;
  view?: LibraryView;
  publishedVideos?: LibraryPublicVideo[];
  articles?: LibraryPublicArticle[];
  approvedMeditations?: LibraryFeedItem[];
}) {
  const text = libraryCopy[locale];
  const { feedItems, guideFeed } = buildLibraryFeedItems(locale, publishedVideos, articles);
  const videoItems = view === "videos"
    ? buildPublicVideoDiscoveryItems(locale, publishedVideos, approvedMeditations) : [];

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
      {view === "dao" ? <DaoHexagramLibrarySection locale={locale} /> :
        view === "videos" ? <VideoDiscovery locale={locale} videos={videoItems} /> : (
        <LibraryFeed locale={locale} items={view === "books" ? guideFeed : feedItems}
          guidesOnly={view === "books"} />
      )}
      <p className="library-note">{text.note}</p>
      <PublicConsultationCta locale={locale} />
    </main>
  );
}
