"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, ChevronDown, GraduationCap, MapPin, Search, Sparkles } from "lucide-react";

import { AcademyCourseCardList, type AcademyCourseItem } from "@/components/academy-course-card-list";
import { DiscoverySectionTabs } from "@/components/discovery-section-tabs";
import type { AcademyView } from "@/data/academy/catalog";
import type { PublicEvent } from "@/data/public-events";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./academy-discovery.module.css";

const COPY = {
  en: {
    eyebrow: "HOLISTIC HOUSE · ACADEMY",
    title: "Find your learning path",
    description: "Explore Reiki, Temple Studies and stress relief. Start free or choose a full learning program.",
    videoTitle: "Explore video lessons",
    videoDescription: "Original lessons and guided practices organized by program and language.",
    searchLabel: "Find a learning course",
    placeholder: "Reiki, Tantra or stress relief…",
    searchButton: "Find my course",
    browse: "Choose your course",
    catalogLabel: "ALL LEARNING PROGRAMMES",
    count: "courses",
    results: "Matching learning options",
    paths: "EXPLORE THE ACADEMY",
    freeCourses: "Free Courses", freeDescription: "Short guided lessons you can begin today.",
    studyPrograms: "Study Programs", studyDescription: "Complete pathways, levels and original study materials.",
    liveEvents: "Live Events", liveDescription: "Workshops and gatherings with confirmed dates.",
    noMatchesInGroup: "No matches in this section.",
    noLiveEvents: "No confirmed upcoming events yet. New workshops will appear when dates are published.",
    viewAllEvents: "Explore all events", resultCount: "results",
    reset: "Show all",
    empty: "No courses found. Try a different search.",
    videoLink: "Browse original video lessons",
    back: "Back to all courses",
    note: "Free Reiki introductions offer educational materials; personal initiations require separate confirmation. Stress Relief is not a substitute for professional care.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · АКАДЕМИЯ",
    title: "Найдите свою программу обучения",
    description: "Изучайте Рейки, храмовые практики и антистресс. Начните бесплатно или выберите полную программу.",
    videoTitle: "Выберите видеоуроки",
    videoDescription: "Авторские уроки и практики, сгруппированные по программам и языкам записи.",
    searchLabel: "Поиск курсов",
    placeholder: "Рейки, Тантра или антистресс…",
    searchButton: "Подобрать курс",
    browse: "Выберите свой курс",
    catalogLabel: "ВСЕ ПРОГРАММЫ ОБУЧЕНИЯ",
    count: "курсов",
    results: "Подходящие варианты",
    paths: "НАПРАВЛЕНИЯ АКАДЕМИИ",
    freeCourses: "Бесплатные курсы", freeDescription: "Короткие занятия, которые можно начать прямо сейчас.",
    studyPrograms: "Программы обучения", studyDescription: "Полные учебные маршруты, ступени и авторские материалы.",
    liveEvents: "Живые встречи", liveDescription: "Семинары и мероприятия с подтверждёнными датами.",
    noMatchesInGroup: "В этой категории совпадений нет.",
    noLiveEvents: "Пока нет подтверждённых будущих мероприятий. Новые встречи появятся после согласования дат.",
    viewAllEvents: "Все мероприятия", resultCount: "результатов",
    reset: "Показать все",
    empty: "Курс не найден. Попробуйте другой запрос.",
    videoLink: "Смотреть авторские видеоуроки",
    back: "Вернуться ко всем курсам",
    note: "Вводные материалы Рейки бесплатны; личная инициация проводится по согласованию. Антистресс — образовательная поддержка, не замена профессиональной помощи.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · ACADEMIA",
    title: "Encuentra tu ruta de aprendizaje",
    description: "Explora Reiki, Temple Studies y antiestrés. Empieza gratis o elige un programa completo.",
    videoTitle: "Explora las videolecciones",
    videoDescription: "Lecciones y prácticas organizadas por programa e idioma original.",
    searchLabel: "Buscar cursos",
    placeholder: "Reiki, Tantra o antiestrés…",
    searchButton: "Buscar curso",
    browse: "Elige tu curso",
    catalogLabel: "TODOS LOS PROGRAMAS",
    count: "cursos",
    results: "Opciones encontradas",
    paths: "EXPLORAR LA ACADEMIA",
    freeCourses: "Cursos gratis", freeDescription: "Lecciones breves que puedes comenzar hoy.",
    studyPrograms: "Programas de estudio", studyDescription: "Recorridos completos, niveles y materiales originales.",
    liveEvents: "Eventos en vivo", liveDescription: "Talleres y encuentros con fechas confirmadas.",
    noMatchesInGroup: "No hay coincidencias en esta sección.",
    noLiveEvents: "Aún no hay eventos próximos confirmados. Se publicarán cuando se confirmen las fechas.",
    viewAllEvents: "Ver todos los eventos", resultCount: "resultados",
    reset: "Mostrar todos",
    empty: "No encontramos cursos. Prueba otra búsqueda.",
    videoLink: "Ver videolecciones originales",
    back: "Volver a todos los cursos",
    note: "Las introducciones de Reiki son gratuitas; la iniciación personal requiere confirmación. OPORA es apoyo educativo, no atención clínica.",
  },
} as const;

const SEARCH_KEYWORDS: Record<string, string> = {
  "academy-free-opora": "opora stress anti-stress antistress antiestrés stress relief стресс антистресс тревога опора 14 days 14 дней",
  "academy-featured-principles-energywork": "free energywork principles basics reiki practitioner study initiation tantra kundalini yggdrasil энергетическая работа основы рейки практик обучение инициация курс gratuito iniciación aprendizaje",
  "academy-free-tantra-introduction": "tantra reiki level 1 free initiation тантра рейки первая ступень бесплатная инициация",
  "academy-free-yggdrasil-introduction": "reiki yggdrasil level 1 free initiation рейки иггдрасиль первая ступень",
  "academy-featured-yggdrasil": "dao yggdrasil reiki basic course training levels рейки иггдрасиль базовый курс",
  "academy-featured-tantra-reiki": "tantra reiki nine levels tantra рейки тантра ступени training",
  "academy-featured-kundalini-reiki": "kundalini reiki master кундалини рейки базовый курс",
  "academy-featured-temple-studies": "temple studies archetypes mysteries tarot runes храмовые традиции мистерии таро руны",
};

const searchTerms = (query: string) => query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
const matchesTerms = (text: string, terms: string[]) => terms.every((term) => text.toLocaleLowerCase().includes(term));


const EVENT_COPY = {
  en: { register: "Register", details: "Details", less: "Less details", workshop: "Workshop", online: "Online", programme: "Workshop programme" },
  ru: { register: "Записаться", details: "Подробнее", less: "Свернуть", workshop: "Мастер-класс", online: "Онлайн", programme: "Программа семинара" },
  es: { register: "Inscribirse", details: "Detalles", less: "Ocultar", workshop: "Taller", online: "En línea", programme: "Programa del taller" },
} as const;

function eventSchedule(event: PublicEvent, locale: PublicLocale): string {
  const date = new Date(event.startsAt);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(
      locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-CA",
      { dateStyle: "medium", timeStyle: "short", timeZone: event.timeZone },
    ).format(date);
  } catch {
    return "";
  }
}

function AcademyLiveEventList({ locale, events }: { locale: PublicLocale; events: readonly PublicEvent[] }) {
  const t = EVENT_COPY[locale];
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  return (
    <div className={styles.eventGrid} role="list" aria-label={COPY[locale].liveEvents}>
      {events.map((event) => {
        const expanded = expandedEvent === event.id;
        const detailsId = "academy-event-details-" + event.id;
        const location = event.format === "online" ? t.online : event.city || event.location || "";
        return (
          <article className={styles.eventCard} role="listitem" key={event.id} data-academy-live-event={event.id}>
            <div className={styles.eventUpper}>
              <div className={styles.eventPhoto}>
                {event.posterUrl ? (
                  <img src={event.posterUrl} alt="" loading="lazy" decoding="async" width={940} height={492} />
                ) : (
                  <CalendarDays size={32} strokeWidth={1.5} aria-hidden="true" />
                )}
              </div>
              <div className={styles.eventContent}>
                <span className={styles.eventType}>{t.workshop}</span>
                <h4>{event.title[locale]}</h4>
                <time dateTime={event.startsAt} className={styles.eventTime}>
                  <CalendarDays size={14} aria-hidden="true" />{eventSchedule(event, locale)}
                </time>
                {location ? <span className={styles.eventLocation}><MapPin size={14} aria-hidden="true" />{location}</span> : null}
                <p className={styles.eventExcerpt}>{event.description[locale]}</p>
                <div className={styles.eventActions}>
                  <button type="button" className={styles.eventDetailsButton}
                    aria-expanded={expanded} aria-controls={detailsId}
                    onClick={() => setExpandedEvent(expanded ? null : event.id)}>
                    {expanded ? t.less : t.details}<ChevronDown size={14} aria-hidden="true" />
                  </button>
                  <a className={styles.eventRegister} href={event.registrationHref}
                    target={event.registrationHref.startsWith("/") ? undefined : "_blank"}
                    rel={event.registrationHref.startsWith("/") ? undefined : "noopener noreferrer"}>
                    {t.register}<ArrowRight size={15} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
            <div className={styles.eventExpanded} id={detailsId} hidden={!expanded}>
              <p>{event.description[locale]}</p>
              {event.highlights?.[locale]?.length ? (
                <>
                  <strong>{t.programme}</strong>
                  <ul>{event.highlights[locale].map((point, index) => <li key={index}>{point}</li>)}</ul>
                </>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function AcademyDiscovery({
  locale,
  view,
  items,
  label,
  events,
}: {
  locale: PublicLocale;
  view: AcademyView;
  items: AcademyCourseItem[];
  label: string;
  events: readonly PublicEvent[];
}) {
  const t = COPY[locale];
  const [query, setQuery] = useState("");
  const terms = useMemo(() => searchTerms(query), [query]);
  const matchedItems = useMemo(() => items.filter((item) =>
    matchesTerms([item.title, item.subtitle, item.description, SEARCH_KEYWORDS[item.id]].filter(Boolean).join(" "), terms),
  ), [items, terms]);
  const isSearching = Boolean(query.trim());
  const freeItems = matchedItems.filter((item) => item.free);
  const studyItems = matchedItems.filter((item) => !item.free);
  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => (
      event.status === "published"
      && /(?:Z|[+-]\\d\\d:\\d\\d)$/.test(event.startsAt)
      && Number.isFinite(Date.parse(event.startsAt))
      && Date.parse(event.startsAt) >= now
      && /^(?:\\/(?!\\/)|https:\\/\\/[^\\s]+$)/.test(event.registrationHref.trim())
    )).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  }, [events]);
  const matchedEvents = useMemo(() => upcomingEvents.filter((event) =>
    matchesTerms([
      ...Object.values(event.title), ...Object.values(event.description),
      ...Object.values(event.highlights ?? {}).flat(), event.city, event.location,
      COPY.en.liveEvents, COPY.ru.liveEvents, COPY.es.liveEvents,
    ].filter(Boolean).join(" "), terms),
  ), [upcomingEvents, terms]);
  const resultCount = matchedItems.length + matchedEvents.length;

  function scrollToResults() {
    const target = document.getElementById("academy-programs");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    scrollToResults();
  }

  return (
    <>
      <section className={styles.hero} aria-labelledby="academy-discovery-title">
        <div className={styles.topline}>
          <p className={styles.eyebrow}><Sparkles aria-hidden="true" size={16} />{t.eyebrow}</p>
          <DiscoverySectionTabs locale={locale} active="courses" />
        </div>
        <h1 id="academy-discovery-title">{view === "videos" ? t.videoTitle : t.title}</h1>
        <p className={styles.intro}>{view === "videos" ? t.videoDescription : t.description}</p>
        {view === "programs" ? (
          <form className={styles.form} role="search" onSubmit={submitSearch}>
            <label className={styles.srOnly} htmlFor="academy-program-query">{t.searchLabel}</label>
            <input
              id="academy-program-query"
              type="search"
              className={styles.search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={120}
              placeholder={t.placeholder}
              autoComplete="off"
            />
            <button className={styles.submit} type="submit">
              {t.searchButton}<Search aria-hidden="true" size={19} />
            </button>
          </form>
        ) : (
          <Link className={styles.videoButton} href="#academy-video-courses">
            {t.videoLink}<ArrowRight aria-hidden="true" size={18} />
          </Link>
        )}
        {view === "programs" ? (
          <nav className={styles.quickPaths} aria-label={t.paths}>
            <a href="#academy-free-courses"><BookOpen size={16} aria-hidden="true" />{t.freeCourses}</a>
            <a href="#academy-study-programs"><GraduationCap size={16} aria-hidden="true" />{t.studyPrograms}</a>
            <a href="#academy-live-events"><CalendarDays size={16} aria-hidden="true" />{t.liveEvents}</a>
          </nav>
        ) : null}
      </section>
      {view === "programs" ? (
        <section className={styles.results} id="academy-programs" aria-label={label}>
          <div className={styles.listHeading}>
            <div>
              <p className={styles.listKicker}>{t.catalogLabel}</p>
              <h2>{isSearching ? t.results : t.browse}</h2>
            </div>
            {isSearching ? (
              <button type="button" className={styles.reset} onClick={() => setQuery("")}>{t.reset}</button>
            ) : (
              <span className={styles.count}>{items.length} {t.count}</span>
            )}
          </div>
          {isSearching && !resultCount ? <p className={styles.empty} role="status">{t.empty}</p> : null}

          <section className={styles.categoryGroup} id="academy-free-courses" aria-labelledby="academy-free-courses-title">
            <div className={styles.categoryHeading}>
              <span className={styles.categoryNumber} aria-hidden="true">1</span>
              <div className={styles.categoryHeadingCopy}>
                <h3 id="academy-free-courses-title">{t.freeCourses}</h3>
                <p>{t.freeDescription}</p>
              </div>
              <span className={styles.categoryCount}>{freeItems.length}</span>
            </div>
            {freeItems.length ? (
              <AcademyCourseCardList locale={locale} items={freeItems} label={t.freeCourses} />
            ) : isSearching ? <p className={styles.categoryEmpty}>{t.noMatchesInGroup}</p> : null}
          </section>

          <section className={styles.categoryGroup} id="academy-study-programs" aria-labelledby="academy-study-programs-title">
            <div className={styles.categoryHeading}>
              <span className={styles.categoryNumber} aria-hidden="true">2</span>
              <div className={styles.categoryHeadingCopy}>
                <h3 id="academy-study-programs-title">{t.studyPrograms}</h3>
                <p>{t.studyDescription}</p>
              </div>
              <span className={styles.categoryCount}>{studyItems.length}</span>
            </div>
            {studyItems.length ? (
              <AcademyCourseCardList locale={locale} items={studyItems} label={t.studyPrograms} />
            ) : isSearching ? <p className={styles.categoryEmpty}>{t.noMatchesInGroup}</p> : null}
          </section>

          <section className={styles.categoryGroup} id="academy-live-events" aria-labelledby="academy-live-events-title">
            <div className={styles.categoryHeading}>
              <span className={styles.categoryNumber} aria-hidden="true">3</span>
              <div className={styles.categoryHeadingCopy}>
                <h3 id="academy-live-events-title">{t.liveEvents}</h3>
                <p>{t.liveDescription}</p>
              </div>
              <span className={styles.categoryCount}>{matchedEvents.length}</span>
            </div>
            {matchedEvents.length ? (
              <AcademyLiveEventList locale={locale} events={matchedEvents} />
            ) : <p className={styles.categoryEmpty}>{isSearching ? t.noMatchesInGroup : t.noLiveEvents}</p>}
            <Link className={styles.videoArchive} href={"/" + locale + "/events"}>
              {t.viewAllEvents}<ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>

          <p className={styles.note}>{t.note}</p>
          <Link className={styles.videoArchive} href={"/" + locale + "/academy?view=videos"}>
            {t.videoLink}<ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <p className={styles.back}><Link href={"/" + locale + "/academy"}>{t.back}<ArrowRight size={16} aria-hidden="true" /></Link></p>
      )}
    </>
  );
}
