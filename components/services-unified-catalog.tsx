"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, BriefcaseBusiness, ChevronDown, Clapperboard, Compass, Flower2,
  GraduationCap, HandHeart, HeartHandshake, MonitorPlay, SlidersHorizontal, Sparkles,
  UsersRound, Video, type LucideIcon } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
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
    title: "Другие варианты поддержки", intro: "Выберите направление — подробности откроются здесь.",
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
    title: "More ways to support you", intro: "Choose a service to see details without leaving this page.",
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
    title: "Más formas de acompañarte", intro: "Elige una opción para ver los detalles aquí mismo.",
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

type CatalogContextValue = {
  locale: PublicLocale;
  expanded: ServicesPanelId | null;
  toggle: (id: ServicesPanelId) => void;
};
const CatalogContext = createContext<CatalogContextValue | null>(null);

export function ServicesCompactCatalog({ locale, children }: { locale: PublicLocale; children: ReactNode }) {
  const [expanded, setExpanded] = useState<ServicesPanelId | null>(null);
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
  const Icon = icons[id];
  const regionId = "services-unified-" + id;
  return (
    <article className={styles.panel} data-services-unified-panel={id} data-expanded={expanded}>
      <button className={styles.preview} type="button" aria-expanded={expanded} aria-controls={regionId}
        onClick={() => context.toggle(id)}>
        <span className={styles.icon} aria-hidden="true"><Icon size={23} strokeWidth={1.8} /></span>
        <span className={styles.previewText}><strong>{title}</strong><small>{description}</small></span>
        <ChevronDown className={styles.chevron} size={17} aria-hidden="true" />
      </button>
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
