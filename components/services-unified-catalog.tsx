"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, BriefcaseBusiness, Clapperboard, Compass, Flower2,
  GraduationCap, HandHeart, HeartHandshake, MonitorPlay, SlidersHorizontal, Sparkles,
  UsersRound, Video, type LucideIcon } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { ServicesCardActions } from "@/components/services-card-actions";
import { isThreeOptionGroup, ServicesThreeVisibleOptions } from "@/components/services-three-visible-options";
import styles from "./services-unified-catalog.module.css";

export type ServicesPanelId = "reiki" | "browse" | "reading" | "consultation" | "services"
  | "video" | "courses" | "coach" | "magical" | "homeopathy"
  | "about" | "testimonials" | "mytube" | "directory";

const icons: Record<ServicesPanelId, LucideIcon> = {
  reiki: HandHeart, browse: SlidersHorizontal, reading: Compass,
  consultation: HeartHandshake, services: BriefcaseBusiness,
  video: Clapperboard, courses: GraduationCap, coach: UsersRound,
  magical: Flower2, homeopathy: Sparkles, about: Video,
  testimonials: HeartHandshake, mytube: MonitorPlay, directory: BookOpen,
};
const words = {
  ru: {
    title: "Все варианты поддержки", intro: "В каждом направлении сразу видны три варианта услуг.",
    panels: {
      reiki: ["Рейки-сессия", "Мастер, время и длительность"],
      browse: ["Подбор по темам", "Онлайн или очно"],
      reading: ["Spiritual Reading", "Дао, Таро, консультации"],
      consultation: ["Личная запись", "Форматы консультации"],
      services: ["Все личные услуги", "Терапия, расстановки, бизнес"],
      video: ["Персональное видео", "Три варианта создания"],
      courses: ["Обучающие курсы", "Рейки и другие программы"],
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
    title: "Explore all services", intro: "Three options are visible in every service category.",
    panels: {
      reiki: ["Reiki sessions", "Practitioners and preferred time"],
      browse: ["Explore by topic", "Online or in person"],
      reading: ["Spiritual Reading", "Taoist insights and Tarot"],
      consultation: ["Personal booking", "Consultation options"],
      services: ["Personal services", "Therapy, constellations, business"],
      video: ["Personal video", "Three video ideas"],
      courses: ["Learning courses", "Reiki and other programmes"],
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
    title: "Todos los servicios", intro: "Tres opciones visibles en cada categoría de servicios.",
    panels: {
      reiki: ["Sesiones de Reiki", "Profesionales y horarios"],
      browse: ["Buscar por tema", "En línea o presencial"],
      reading: ["Spiritual Reading", "Tao y Tarot"],
      consultation: ["Consulta personal", "Opciones de sesión"],
      services: ["Servicios personales", "Terapia, constelaciones, negocios"],
      video: ["Vídeo personal", "Tres ideas de vídeo"],
      courses: ["Cursos", "Reiki y otros programas"],
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
    services: "Discover personal therapy, guided imagery, systemic constellations and business consultations in the published services catalogue.",
    video: "Explore personal video formats and create a reflection, meditation or message in the existing Video Studio using your own theme.",
    courses: "Explore published Reiki courses, free introductory practices and learning programmes in the Holistic House Academy.",
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
    services: "Изучите психотерапию, направленную работу с образами, системные расстановки и бизнес-консультации в каталоге услуг.",
    video: "Выберите формат личного видео: размышление, медитацию или послание на вашу тему в существующей видеостудии.",
    courses: "Посмотрите опубликованные курсы Рейки, бесплатные вводные практики и обучающие программы Академии Holistic House.",
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
    services: "Descubre terapia personal, imaginación guiada, constelaciones sistémicas y consultas de negocios en el catálogo.",
    video: "Explora vídeos de reflexión, meditación o mensajes y crea una pieza sobre tu propio tema en el estudio existente.",
    courses: "Descubre cursos de Reiki, prácticas introductorias gratuitas y programas de la Academia Holistic House.",
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
  expanded: ServicesPanelId | null;
  toggle: (id: ServicesPanelId) => void;
};
const CatalogContext = createContext<CatalogContextValue | null>(null);

export function ServicesCompactCatalog({ locale, children }: { locale: PublicLocale; children: ReactNode }) {
  const [expanded, setExpanded] = useState<ServicesPanelId | null>(null);
  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;
    const revealLinkedService = () => {
      if (!window.matchMedia("(max-width: 760px)").matches) return;
      const id = panelFromHash[window.location.hash.slice(1)];
      if (!id) return;
      setExpanded(id);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      // Wait for React to reveal the panel before scrolling to a hidden anchor.
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          const panel = document.querySelector<HTMLElement>(
            '[data-services-unified-panel="' + id + '"]'
          );
          panel?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            block: "start",
          });
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
    <CatalogContext.Provider value={{ locale, expanded, toggle: id => setExpanded(value => value === id ? null : id) }}>
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
  const expanded = context.expanded === id;
  const hasVariants = isThreeOptionGroup(id);
  const Icon = icons[id];
  const regionId = "services-unified-" + id;
  const more = {
    ru: ["Показать все форматы", "Скрыть дополнительные форматы", "3 варианта"],
    en: ["Explore all formats", "Hide extra formats", "3 options"],
    es: ["Ver todos los formatos", "Ocultar formatos adicionales", "3 opciones"],
  }[context.locale];
  return (
    <article className={styles.panel} data-services-unified-panel={id}
      data-services-has-three={hasVariants} data-expanded={expanded}>
      <button type="button" className={styles.preview}
        aria-expanded={expanded} aria-controls={regionId}
        onClick={() => context.toggle(id)}>
        <span className={styles.icon} aria-hidden="true"><Icon size={23} strokeWidth={1.8} /></span>
        <span className={styles.previewText}><strong>{title}</strong><small>{description}</small></span>
        {hasVariants ? <span className={styles.variantCount}>{more[2]}</span>
          : <ArrowRight className={styles.previewArrow} size={19} aria-hidden="true" />}
      </button>
      {isThreeOptionGroup(id) ? (
        <ServicesThreeVisibleOptions locale={context.locale} id={id} />
      ) : (
        <ServicesCardActions locale={context.locale} title={title}
          description={panelDescriptions[context.locale][id]}
          href={"/" + context.locale + panelDestinations[id]}
          trackingId={id} className={styles.panelActions} />
      )}
      {hasVariants ? <button type="button" className={styles.moreFormats}
        aria-expanded={expanded} aria-controls={regionId} onClick={() => context.toggle(id)}>
        {expanded ? more[1] : more[0]} <ArrowRight size={16} aria-hidden="true" />
      </button> : null}
      <div id={regionId} className={styles.content} role="region" aria-label={title}>
        {children}
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
