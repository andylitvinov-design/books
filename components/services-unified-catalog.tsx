"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, BriefcaseBusiness, Clapperboard, Compass, ChevronDown, Flower2,
  GraduationCap, HandHeart, HeartHandshake, MonitorPlay, SlidersHorizontal, Sparkles,
  UsersRound, Video, type LucideIcon } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { ServicesCardActions } from "@/components/services-card-actions";
import { isThreeOptionGroup, ServicesThreeVisibleOptions } from "@/components/services-three-visible-options";
import { serviceGroupAnchor } from "@/lib/services-quick-categories";
import styles from "./services-unified-catalog.module.css";

export type ServicesPanelId = "reiki" | "browse" | "reading" | "consultation" | "services" | "business"
  | "video" | "courses" | "coach" | "magical" | "homeopathy"
  | "about" | "testimonials" | "mytube" | "directory";

const icons: Record<ServicesPanelId, LucideIcon> = {
  reiki: HandHeart, browse: SlidersHorizontal, reading: Compass,
  consultation: HeartHandshake, services: HeartHandshake, business: BriefcaseBusiness,
  video: Clapperboard, courses: GraduationCap, coach: UsersRound,
  magical: Flower2, homeopathy: Sparkles, about: Video,
  testimonials: HeartHandshake, mytube: MonitorPlay, directory: BookOpen,
};

/* Photographic 14-panel catalog: reuse existing first-party assets only.
   Lazy 96px thumbs avoid extra Vercel image-generation work. */
const panelMedia: Record<ServicesPanelId, string> = {
  reiki: "/images/holistic-house/reiki-practitioner-sunrise.webp",
  browse: "/images/holistic-house/report-lighthouse-coast.webp",
  reading: "/images/holistic-house/homepage-constellations.svg",
  consultation: "/images/holistic-house/andy-about.png",
  services: "/images/holistic-house/homepage-constellations.svg",
  business: "/images/holistic-house/andy-about.png",
  video: "/images/holistic-house/assist-video-botanical.svg",
  courses: "/images/holistic-house/books-library.webp",
  coach: "/images/holistic-house/andy-about.png",
  magical: "/images/holistic-house/reiki-practitioner-sunrise.webp",
  homeopathy: "/images/holistic-house/distance-homeopathy.webp",
  about: "/images/holistic-house/andy-about.png",
  testimonials: "/images/holistic-house/reiki-approved-sunrise-v3.webp",
  mytube: "/images/holistic-house/assist-video-botanical.svg",
  directory: "/images/holistic-house/messenger-zen-stones.svg",
};
type PriceKind = "free" | "someFree" | "quote" | "mixed" | "session" | "from";
const panelPriceKind: Record<ServicesPanelId, PriceKind> = {
  reiki: "quote", browse: "mixed", reading: "quote", consultation: "from",
  services: "mixed", business: "mixed", video: "someFree", courses: "someFree", coach: "someFree",
  magical: "quote", homeopathy: "session", about: "free",
  testimonials: "free", mytube: "free", directory: "mixed",
};
const priceWords: Record<PublicLocale, Record<PriceKind,string>> = {
  ru: { free: "Бесплатно", someFree: "Есть бесплатно", quote: "По запросу",
        mixed: "Разные цены", session: "€100 / 60 мин", from: "От €50" },
  en: { free: "Free", someFree: "Free options", quote: "Price on request",
        mixed: "Various prices", session: "€100 / 60 min", from: "From €50" },
  es: { free: "Gratis", someFree: "Opciones gratis", quote: "Consultar",
        mixed: "Varios precios", session: "€100 / 60 min", from: "Desde €50" },
};

const words = {
  ru: {
    title: "Все варианты поддержки", intro: "Три доступных варианта каждого направления — сразу на странице.",
    panels: {
      reiki: ["Рейки-сессия", "Мастер, время и длительность"],
      browse: ["Тесты и самопомощь", "Оценка состояния и бесплатный разбор"],
      reading: ["Spiritual Reading", "Дао, Таро, консультации"],
      consultation: ["Терапия и коучинг", "Поддержка эмоций, ресурсов и личных целей"],
      services: ["Отношения и расстановки", "Партнёрские и семейные сценарии"],
      business: ["Бизнес и карьера", "Консультации, стратегия и командные вопросы"],
      video: ["Персональное видео", "Три варианта создания"],
      courses: ["Курсы, видео и медитации", "ОПОРА, практики и персональное видео"],
      coach: ["Коуч и терапевт", "Личный и ИИ-консультант"],
      magical: ["Мандалы и ритуалы", "Символические практики"],
      homeopathy: ["Психогомеопатия", "Подход и варианты обращения"],
      about: ["О специалисте", "Знакомство и видео"],
      testimonials: ["Отзывы", "Истории клиентов"],
      mytube: ["Видео по методам", "Объяснения и архив"],
      directory: ["Все мастера", "Каталог и контакты"],
    },
    homeopathy: ["Об авторском подходе", "Бесплатный разбор", "Все предложения специалистов"],
  },
  en: {
    title: "Explore all services", intro: "Three options are visible in each service category.",
    panels: {
      reiki: ["Reiki sessions", "Practitioners and preferred time"],
      browse: ["Tests & self-help", "Self-checks and free situation review"],
      reading: ["Spiritual Reading", "Taoist insights and Tarot"],
      consultation: ["Therapy & coaching", "Support for emotions, energy and personal goals"],
      services: ["Relationships & constellations", "Personal, family and partnership patterns"],
      business: ["Business & career", "Consultations, strategy and team challenges"],
      video: ["Personal video", "Three video ideas"],
      courses: ["Courses, videos & meditations", "OPORA, practices and personal videos"],
      coach: ["Coach & therapist", "Personal and AI options"],
      magical: ["Mandalas & rituals", "Symbolic practices"],
      homeopathy: ["Psycho-homeopathy", "Approach and ways to enquire"],
      about: ["Meet your guide", "Introduction and video"],
      testimonials: ["Testimonials", "Client experiences"],
      mytube: ["Method videos", "Explanations and archive"],
      directory: ["All practitioners", "Directory and contact"],
    },
    homeopathy: ["About the approach", "Free situation review", "All practitioner offers"],
  },
  es: {
    title: "Todos los servicios", intro: "Tres opciones visibles en cada categoría.",
    panels: {
      reiki: ["Sesiones de Reiki", "Profesionales y horarios"],
      browse: ["Tests y autoayuda", "Autoevaluaciones y revisión gratuita"],
      reading: ["Spiritual Reading", "Tao y Tarot"],
      consultation: ["Terapia y coaching", "Apoyo emocional, recursos y metas personales"],
      services: ["Relaciones y constelaciones", "Patrones personales, familiares y de pareja"],
      business: ["Negocios y carrera", "Consultas, estrategia y equipos"],
      video: ["Vídeo personal", "Tres ideas de vídeo"],
      courses: ["Cursos, vídeos y meditación", "OPORA, prácticas y vídeos personales"],
      coach: ["Coach y terapeuta", "Opciones personales y de IA"],
      magical: ["Mandalas y rituales", "Prácticas simbólicas"],
      homeopathy: ["Psico-homeopatía", "Enfoque y consultas"],
      about: ["Conoce al guía", "Presentación y vídeo"],
      testimonials: ["Testimonios", "Experiencias de clientes"],
      mytube: ["Vídeos de métodos", "Explicaciones y archivo"],
      directory: ["Profesionales", "Directorio y contacto"],
    },
    homeopathy: ["Conocer el enfoque", "Revisión gratuita", "Todas las ofertas profesionales"],
  },
} as const;


/* Public first-party destinations for expanded descriptions, never checkout shortcuts. */
const panelDestinations: Record<ServicesPanelId, string> = {
  reiki: "/services/remote-energy-support",
  browse: "/services/catalog",
  reading: "/services/spiritual-reading",
  consultation: "/services/free-consultation",
  services: "/services/catalog",
  business: "/services/business-consulting",
  video: "/holistic-support/mandala",
  courses: "/academy",
  coach: "/my-coach",
  magical: "/temple-support",
  homeopathy: "/services/psychohomeopathy",
  about: "/about",
  testimonials: "/about",
  mytube: "/mytube",
  directory: "/masters",
};

const panelDescriptions = {
  en: {
    reiki: "Browse remote Reiki and energy-support formats, choose a practitioner and ask about an available time. Pricing and session details are confirmed separately.",
    browse: "Explore published services by topic and choose an online or in-person format suitable for your question.",
    reading: "Explore Taoist reflections and Tarot-inspired symbolic readings for personal insight; these practices do not establish facts or medical diagnoses.",
    consultation: "Compare written reviews and personal sessions with Andrey, then enquire about the preferred format and available times.",
    services: "Explore relationship, family and partnership patterns with guided imagery and systemic constellations.",
    business: "Clarify business, career, client and team challenges through an individual consultation, systematic mapping or written review.",
    video: "Explore personal video formats and create a reflection, meditation or message in the existing Video Studio using your own theme.",
    courses: "Explore anti-stress learning, guided meditations and personal video resources; Reiki training is in Shamanica.",
    coach: "Choose between personal practitioner support and AI-led reflection, with clear boundaries between the two formats.",
    magical: "Explore mandalas and symbolic ritual practices to reflect on goals, intentions and personal meaning.",
    homeopathy: "Read about the author's symbolic psycho-homeopathy approach. Homeopathy has no reliable evidence of treating medical conditions.",
    about: "Meet Andrey and learn about his methods, experience and approach through the published introduction and videos.",
    testimonials: "Read published client experiences and reviews. Individual results vary and stories are not a guarantee of outcomes.",
    mytube: "Watch method demonstrations, explanations and published videos from the Holistic House video library.",
    directory: "Browse the public practitioner directory and enquire about an individual specialist's available services.",
  },
  ru: {
    reiki: "Посмотрите форматы дистанционной поддержки Рейки, выберите специалиста и уточните удобное время. Стоимость и условия согласовываются отдельно.",
    browse: "Изучите опубликованные услуги по интересующим темам и выберите подходящий формат онлайн или очно.",
    reading: "Познакомьтесь с символической рефлексией Дао и Таро. Такие практики не устанавливают факты и не заменяют медицинскую диагностику.",
    consultation: "Сравните письменные разборы и личные встречи с Андреем, затем уточните удобный формат и доступное время.",
    services: "Исследуйте отношения и семейные сценарии через образную терапию и системные расстановки.",
    business: "Разберите рабочий запрос, стратегию, командные отношения или деловые решения на личной консультации.",
    video: "Выберите формат личного видео: размышление, медитацию или послание на вашу тему в существующей видеостудии.",
    courses: "Изучите антистресс-программы, медитации и персональные видео. Обучение Рейки представлено в Шаманике.",
    coach: "Выберите работу с практиком или предварительный диалог с ИИ, понимая различия между этими форматами.",
    magical: "Изучите мандалы и символические ритуальные практики для размышлений о целях, намерениях и смыслах.",
    homeopathy: "Узнайте об авторской символической психогомеопатии. Надёжных доказательств лечения заболеваний гомеопатией нет.",
    about: "Познакомьтесь с Андреем, его опытом и подходом через опубликованное описание и видеоматериалы.",
    testimonials: "Прочитайте отзывы и истории клиентов. Индивидуальный результат может отличаться и не гарантируется.",
    mytube: "Смотрите объяснения методов, демонстрации и опубликованные видеоматериалы Holistic House.",
    directory: "Изучите открытый каталог специалистов и уточните доступные услуги выбранного практика.",
  },
  es: {
    reiki: "Explora las sesiones de Reiki y apoyo energético a distancia, elige profesional y consulta horarios. El precio se confirma por separado.",
    browse: "Explora los servicios publicados por tema y elige una modalidad en línea o presencial.",
    reading: "Conoce las reflexiones taoístas y lecturas simbólicas inspiradas en el Tarot; no establecen hechos ni diagnósticos médicos.",
    consultation: "Compara revisiones escritas y sesiones personales con Andrey y pregunta por formatos y horarios disponibles.",
    services: "Explora las relaciones y los patrones familiares con imágenes guiadas y constelaciones sistémicas.",
    business: "Aclara decisiones, estrategia, equipos o metas profesionales con revisión escrita o consulta personal.",
    video: "Explora vídeos de reflexión, meditación o mensajes y crea una pieza sobre tu propio tema en el estudio existente.",
    courses: "Explora programas antiestrés, meditaciones guiadas y vídeos personales; Reiki se presenta en Shamanica.",
    coach: "Elige entre acompañamiento humano y reflexión con IA, con distinciones claras entre las dos modalidades.",
    magical: "Conoce mandalas y prácticas rituales simbólicas para reflexionar sobre metas, intenciones y significados.",
    homeopathy: "Lee sobre la psico-homeopatía simbólica del autor. La homeopatía no tiene evidencia fiable para tratar enfermedades.",
    about: "Conoce a Andrey, su experiencia y sus métodos a través de la presentación y los vídeos publicados.",
    testimonials: "Lee experiencias y reseñas de clientes. Los resultados individuales pueden variar y no están garantizados.",
    mytube: "Mira demostraciones, explicaciones y vídeos publicados en la biblioteca de Holistic House.",
    directory: "Explora el directorio público y pregunta por los servicios de cada profesional.",
  },
} as const;

/** Existing Services deep links must open the content now that mobile panels collapse. */
const panelFromHash: Record<string, ServicesPanelId> = {
  consultation: "consultation",
  "free-insights": "services",
  solutions: "services",
  "service-results": "services",
  "method-videos": "mytube",
  "meet-andrey": "about",
};

type CatalogContextValue = {
  locale: PublicLocale;
  expanded: ReadonlySet<ServicesPanelId>;
  toggle: (id: ServicesPanelId) => void;
};
const CatalogContext = createContext<CatalogContextValue | null>(null);

export function ServicesCompactCatalog({ locale, children }: { locale: PublicLocale; children: ReactNode }) {
  const [expanded, setExpanded] = useState<ReadonlySet<ServicesPanelId>>(() => new Set());
  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;
    const revealLinkedService = () => {
      // Compact panels now exist at desktop widths too. Follow recognized
      // deep links at every viewport, opening only the requested group.
      const hash = window.location.hash.slice(1);
      const id = Object.hasOwn(panelFromHash, hash) ? panelFromHash[hash] : undefined;
      if (!id) return;
      setExpanded(previous => new Set(previous).add(id));
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      // Wait for React to reveal the panel before scrolling to a hidden anchor.
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          const panel = document.querySelector<HTMLElement>(
            '[data-services-unified-panel="' + id + '"]'
          );
          // The session link lands on its actual paid choices once mounted.
          // Other legacy hashes retain their existing panel-level scroll.
          const booking = hash === "consultation" ? document.getElementById(hash) : null;
          const options: ScrollIntoViewOptions = {
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            block: "start",
          };
          if (booking && panel?.contains(booking)) booking.scrollIntoView(options);
          else panel?.scrollIntoView(options);
        });
      });
    };
    revealLinkedService();
    window.addEventListener("hashchange", revealLinkedService);
    return () => {
      window.removeEventListener("hashchange", revealLinkedService);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);
  return (
    <CatalogContext.Provider value={{ locale, expanded, toggle: id => setExpanded(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; }) }}>
      <section className={styles.catalog} data-services-unified-catalog lang={locale} aria-labelledby="services-unified-heading">
        <header className={styles.catalogHeading}>
          <h2 id="services-unified-heading">{words[locale].title}</h2>
          <p>{words[locale].intro}</p>
        </header>
        <div className={styles.grid}>{children}</div>
      </section>
    </CatalogContext.Provider>
  );
}

export function ServicesCompactPanel({ id, children }: { id: ServicesPanelId; children: ReactNode }) {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("ServicesCompactPanel requires ServicesCompactCatalog");
  const [title, description] = words[context.locale].panels[id];
  const expanded = context.expanded.has(id);
  const hasVariants = isThreeOptionGroup(id);
  const Icon = icons[id];
  const regionId = "services-unified-" + id;
  const more = {
    ru: ["Показать дополнительные варианты", "Скрыть дополнительные варианты"],
    en: ["Explore additional formats", "Hide additional formats"],
    es: ["Ver opciones adicionales", "Ocultar opciones adicionales"],
  }[context.locale];
  return (
    <article id={serviceGroupAnchor(id)} tabIndex={-1}
      className={styles.panel} data-support-uniform-card data-services-unified-panel={id}
      data-services-has-three={hasVariants} data-expanded={expanded}>
      <button type="button" className={styles.preview} data-support-uniform-preview
        aria-expanded={expanded} aria-controls={regionId} onClick={() => context.toggle(id)}>
        <span className={styles.icon} data-support-uniform-photo aria-hidden="true">
          <Image src={panelMedia[id]} alt="" fill loading="lazy" sizes="(max-width: 760px) 34vw, 120px" />
          <span className={styles.iconOverlay}><Icon size={19} strokeWidth={1.8} /></span>
        </span>
        <span className={styles.previewText} data-support-uniform-copy><strong>{title}</strong><small>{description}</small></span>
        <span className={styles.priceBadge} data-support-uniform-price data-service-price-kind={panelPriceKind[id]}>
          {priceWords[context.locale][panelPriceKind[id]]}
        </span>
        <ChevronDown className={styles.chevron} data-support-uniform-chevron size={17} aria-hidden="true" />
      </button>
      <ServicesCardActions locale={context.locale} title={title}
        description={panelDescriptions[context.locale][id]}
        href={"/" + context.locale + panelDestinations[id]}
        trackingId={id} className={styles.panelActions} />
      {hasVariants ? <ServicesThreeVisibleOptions locale={context.locale} id={id} /> : null}
      {hasVariants ? <button type="button" className={styles.moreFormats} data-support-more-formats
        aria-expanded={expanded} aria-controls={regionId} onClick={() => context.toggle(id)}>
        {expanded ? more[1] : more[0]} <ArrowRight size={16} aria-hidden="true" />
      </button> : null}
      <div id={regionId} className={styles.content} role="region" aria-label={title}
        hidden={!expanded} style={!expanded ? {
          display:"none", visibility:"hidden", position:"absolute",
          width:0, height:0, overflow:"hidden", pointerEvents:"none",
        } : undefined}>
        {/* Old consultation and practitioner enquiry forms are optional.
            Do not mount them under the compact list until the category is
            explicitly opened; CSS on the nested form otherwise overrides the
            collapsed mobile view. Deep links and expanded panels retain
            their original working actions. */}
        {(id === "consultation" || id === "directory") && !expanded ? null : children}
      </div>
    </article>
  );
}

/** Published first-party links only. The separate homeopathy portraits PR remains independently owned. */
export function ServicesHomeopathyLinks({ locale }: { locale: PublicLocale }) {
  const t = words[locale].homeopathy;
  return (
    <nav className={styles.homeopathyLinks} aria-label={words[locale].panels.homeopathy[0]}>
      {[
        ["services/psychohomeopathy", t[0]],
        ["services/free-situation-review", t[1]],
        ["services/catalog#service-listings", t[2]],
      ].map(([path, title]) =>
        <Link href={"/" + locale + "/" + path} key={path} prefetch={false}>
          {title}<ArrowRight size={17} aria-hidden="true" />
        </Link>
      )}
    </nav>
  );
}
