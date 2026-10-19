"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronDown, MapPin, Search, Sparkles } from "lucide-react";
import { DiscoverySectionTabs } from "@/components/discovery-section-tabs";
import type { PublicEvent, PublicEventFormat } from "@/data/public-events";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./events-discovery.module.css";

type FormatChoice = PublicEventFormat | "all";

const copy = {
  en: {
    kicker: "HOLISTIC HOUSE · EVENTS",
    title: "Find your next event",
    lead: "Explore workshops, community circles and shared practices. Discover confirmed dates and choose an experience that feels right.",
    catalogLabel: "UPCOMING GATHERINGS", archiveLabel: "PAST GATHERINGS", browse: "Choose your event",
    upcomingTab: "Upcoming", pastTab: "Past", calendar: "Event dates",
    eventSingle: "event", eventPlural: "events",
    placeholder: "Search by topic, location or event name...",
    search: "Find events", searchLabel: "Search public events",
    upcoming: "Upcoming events", past: "Past events", allFormats: "All formats", online: "Online", inPerson: "In person",
    filters: "Event format", all: "All", somatic: "Body & safety", connection: "Heart & connection", reiki: "Energy & Reiki", temple: "Temple studies",
    noDates: "No confirmed upcoming dates are published yet.", noDatesHelp: "New dates and registration links appear here as soon as the organizer confirms them.",
    noMatches: "No events match these filters.", noMatchesHelp: "Try another topic or show the full calendar.",
    reset: "Clear filters", view: "Register", details: "Details", program: "Workshop program", onlineLocation: "Online", pastNote: "Past events are shown for reference, not for booking.",
  },
  ru: {
    kicker: "HOLISTIC HOUSE · СОБЫТИЯ",
    title: "Найдите свою встречу",
    lead: "Мастер-классы, групповые практики и встречи сообщества. Выбирайте из событий с подтверждёнными датами и открытой регистрацией.",
    catalogLabel: "БЛИЖАЙШИЕ ВСТРЕЧИ", archiveLabel: "ПРОШЕДШИЕ ВСТРЕЧИ", browse: "Выберите событие",
    upcomingTab: "Скоро", pastTab: "Архив", calendar: "Даты событий",
    eventSingle: "событие", eventPlural: "событий",
    placeholder: "Тема, город или название мероприятия...",
    search: "Найти события", searchLabel: "Поиск публичных мероприятий",
    upcoming: "Ближайшие события", past: "Прошедшие события", allFormats: "Все форматы", online: "Онлайн", inPerson: "Очно",
    filters: "Формат мероприятий", all: "Все", somatic: "Тело и безопасность", connection: "Сердце и общение", reiki: "Энергия и Рейки", temple: "Храмовые практики",
    noDates: "Пока нет опубликованных подтверждённых дат.", noDatesHelp: "Новые даты и ссылки на регистрацию появятся здесь после подтверждения организатором.",
    noMatches: "По этим фильтрам событий нет.", noMatchesHelp: "Попробуйте другую тему или очистите фильтры.",
    reset: "Сбросить фильтры", view: "Записаться", details: "Подробнее", program: "Программа семинара", onlineLocation: "Онлайн", pastNote: "Прошедшие встречи показаны для информации, не для записи.",
  },
  es: {
    kicker: "HOLISTIC HOUSE · EVENTOS",
    title: "Encuentra tu próximo evento",
    lead: "Explora talleres, círculos y prácticas compartidas. Descubre fechas confirmadas y elige una experiencia para ti.",
    catalogLabel: "PRÓXIMOS ENCUENTROS", archiveLabel: "ENCUENTROS ANTERIORES", browse: "Elige tu evento",
    upcomingTab: "Próximos", pastTab: "Anteriores", calendar: "Fechas de eventos",
    eventSingle: "evento", eventPlural: "eventos",
    placeholder: "Busca por tema, lugar o evento...",
    search: "Buscar eventos", searchLabel: "Buscar eventos públicos",
    upcoming: "Próximos eventos", past: "Eventos anteriores", allFormats: "Todos los formatos", online: "En línea", inPerson: "Presencial",
    filters: "Formato del evento", all: "Todos", somatic: "Cuerpo y seguridad", connection: "Corazón y conexión", reiki: "Energía y Reiki", temple: "Estudios del templo",
    noDates: "Todavía no hay fechas próximas confirmadas.", noDatesHelp: "Publicaremos las fechas y los enlaces de inscripción cuando el organizador los confirme.",
    noMatches: "No hay eventos con estos filtros.", noMatchesHelp: "Prueba otro tema o restablece los filtros.",
    reset: "Borrar filtros", view: "Inscribirse", details: "Detalles", program: "Programa del taller", onlineLocation: "En línea", pastNote: "Los eventos anteriores son informativos; no están disponibles para reservar.",
  },
} as const;

function renderSchedule(event: PublicEvent, locale: PublicLocale) {
  const date = new Date(event.startsAt);
  if (Number.isNaN(date.getTime())) return "";
  try {
    const language = locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-CA";
    const start = new Intl.DateTimeFormat(language, {
      dateStyle: "medium", timeStyle: "short", timeZone: event.timeZone,
    }).format(date);
    const end = event.endsAt ? new Date(event.endsAt) : null;
    if (!end || Number.isNaN(end.getTime()) || end <= date) return start;
    return start + " – " + new Intl.DateTimeFormat(language, {
      timeStyle: "short", timeZone: event.timeZone,
    }).format(end);
  } catch {
    return "";
  }
}

export function EventsDiscovery({ locale, events }: { locale: PublicLocale; events: readonly PublicEvent[] }) {
  const t = copy[locale];
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState<FormatChoice>("all");
  const [past, setPast] = useState(false);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const filtersActive = Boolean(search.trim()) || format !== "all";
  const verified = useMemo(() => events.filter(event =>
    event.status === "published"
    && /(?:Z|[+-]\d\d:\d\d)$/.test(event.startsAt)
    && !Number.isNaN(Date.parse(event.startsAt))
    && /^(?:\/(?!\/)|https:\/\/[^\s]+$)/.test(event.registrationHref.trim())
  ), [events]);
  const filtered = useMemo(() => {
    const now = Date.now();
    const term = search.trim().toLocaleLowerCase(locale);
    return verified.filter(event => {
      const starts = Date.parse(event.startsAt);
      if (past ? starts >= now : starts < now) return false;
      if (format !== "all" && event.format !== format) return false;
      return !term || [
        ...Object.values(event.title), ...Object.values(event.description),
        ...Object.values(event.highlights ?? {}).flat(),
        event.city || "", event.location || "",
      ].join(" ").toLocaleLowerCase(locale).includes(term);
    }).sort((a,b) => past ? Date.parse(b.startsAt) - Date.parse(a.startsAt) : Date.parse(a.startsAt) - Date.parse(b.startsAt));
  }, [verified, past, format, search, locale]);
  const anyInPeriod = verified.some(event => past ? Date.parse(event.startsAt) < Date.now() : Date.parse(event.startsAt) >= Date.now());

  function reset() { setSearchText(""); setSearch(""); setFormat("all"); }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchText.slice(0, 120));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("hh-events-results")?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth", block: "start",
    });
  }

  return (
    <div className={styles.root} data-events-discovery>
      <section className={styles.hero} aria-labelledby="hh-events-title">
        <div className={styles.topline}>
          <p className={styles.kicker}><Sparkles size={16} aria-hidden="true" />{t.kicker}</p>
          <DiscoverySectionTabs locale={locale} active="events" />
        </div>
        <h1 id="hh-events-title">{t.title}</h1>
        <p className={styles.lead}>{t.lead}</p>
        <form className={styles.form} role="search" onSubmit={submitSearch}>
          <label htmlFor="hh-events-search" className={styles.srOnly}>{t.searchLabel}</label>
          <input id="hh-events-search" type="search" value={searchText}
            onChange={event => { setSearchText(event.target.value); if (!event.target.value.trim()) setSearch(""); }}
            maxLength={120} autoComplete="off" placeholder={t.placeholder} />
          <button type="submit">{t.search}<Search size={19} aria-hidden="true" /></button>
        </form>
      </section>

      <section className={styles.results} id="hh-events-results" aria-labelledby="hh-events-results-title">
        <div className={styles.resultHeading}>
          <div>
            <p className={styles.listKicker}>{past ? t.archiveLabel : t.catalogLabel}</p>
            <h2 id="hh-events-results-title">{past ? t.past : t.browse}</h2>
          </div>
          <span className={styles.count} role="status" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? t.eventSingle : t.eventPlural}
          </span>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.periods} role="group" aria-label={t.calendar}>
            <button type="button" aria-pressed={!past} onClick={() => { setPast(false); setOpenEventId(null); }}>{t.upcomingTab}</button>
            <button type="button" aria-pressed={past} onClick={() => { setPast(true); setOpenEventId(null); }}>{t.pastTab}</button>
          </div>
          <div className={styles.toolbarControls}>
            <label>
              <span className={styles.srOnly}>{t.filters}</span>
              <select value={format} aria-label={t.filters} onChange={event => setFormat(event.target.value as FormatChoice)}>
                <option value="all">{t.allFormats}</option>
                <option value="in_person">{t.inPerson}</option>
                <option value="online">{t.online}</option>
              </select>
            </label>
            {filtersActive && <button type="button" className={styles.reset} onClick={reset}>{t.reset} ×</button>}
          </div>
        </div>
        {filtered.length ? (
          <div className={styles.eventGrid}>
            {filtered.map(event => {
              const expanded = openEventId === event.id;
              const where = event.format === "online" ? t.onlineLocation
                : event.location?.split(",").slice(0, 2).join(",") || event.city || "";
              const detailsId = "hh-event-details-" + event.id;
              return (
                <article key={event.id} className={styles.eventCard} data-event-card={event.id}>
                  <div className={styles.posterFrame}>
                    <div className={styles.posterFallback} aria-hidden="true"><CalendarDays size={36} strokeWidth={1.3} /></div>
                    {event.posterUrl && (
                      <img src={event.posterUrl} className={styles.eventPoster} alt="" width={940} height={492}
                        loading="lazy" decoding="async" onError={error => { error.currentTarget.style.display = "none"; }} />
                    )}
                  </div>
                  <div className={styles.eventContent}>
                    <div className={styles.eventTop}>
                      <span className={styles.eventTheme}>{t[event.category]}</span>
                      <span className={styles.eventFormat}>{event.format === "online" ? t.online : t.inPerson}</span>
                    </div>
                    <h3>{event.title[locale]}</h3>
                    <div className={styles.eventMeta}>
                      <time dateTime={event.startsAt}><CalendarDays size={15} aria-hidden="true" />{renderSchedule(event, locale)}</time>
                      {where && <span className={styles.eventLocation}><MapPin size={15} aria-hidden="true" />{where}</span>}
                    </div>
                    <p className={styles.eventExcerpt}>{event.description[locale]}</p>
                    <div className={styles.eventActions}>
                      <button type="button" className={styles.detailsButton} aria-expanded={expanded}
                        aria-controls={detailsId} onClick={() => setOpenEventId(expanded ? null : event.id)}>
                        {t.details}<ChevronDown size={15} aria-hidden="true" />
                      </button>
                      {!past && (event.registrationHref.startsWith("/") ? (
                        <Link className={styles.registerButton} href={event.registrationHref} prefetch={false}>
                          {t.view}<ArrowRight size={16} aria-hidden="true" />
                        </Link>
                      ) : (
                        <a className={styles.registerButton} href={event.registrationHref} target="_blank" rel="noopener noreferrer">
                          {t.view}<ArrowRight size={16} aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                    <div id={detailsId} className={styles.eventExpanded} hidden={!expanded}>
                      <p>{event.description[locale]}</p>
                      {event.format === "in_person" && event.location && <p className={styles.venue}><MapPin size={14} aria-hidden="true" />{event.location}</p>}
                      {event.highlights?.[locale]?.length ? (
                        <>
                          <strong>{t.program}</strong>
                          <ul>{event.highlights[locale].map((point, index) => <li key={index}>{point}</li>)}</ul>
                        </>
                      ) : null}
                      {past && <small>{t.pastNote}</small>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            <CalendarDays size={28} strokeWidth={1.5} aria-hidden="true" />
            <h3>{anyInPeriod ? t.noMatches : t.noDates}</h3>
            <p>{anyInPeriod ? t.noMatchesHelp : t.noDatesHelp}</p>
            {past && <small>{t.pastNote}</small>}
          </div>
        )}
      </section>
    </div>
  );
}
