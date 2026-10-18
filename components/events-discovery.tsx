"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, HeartHandshake, Leaf, MapPin, Search, Sparkles, Waves } from "lucide-react";
import { DiscoverySectionTabs } from "@/components/discovery-section-tabs";
import type { PublicEvent, PublicEventCategory, PublicEventFormat } from "@/data/public-events";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./events-discovery.module.css";

type CategoryChoice = PublicEventCategory | "all";
type FormatChoice = PublicEventFormat | "all";
const categoryIds: readonly CategoryChoice[] = ["all", "somatic", "connection", "reiki", "temple"];
const themeIcons = { somatic: Leaf, connection: HeartHandshake, reiki: Waves, temple: Sparkles } as const;

const copy = {
  en: {
    kicker: "FIND YOUR WAY · HOLISTIC HOUSE",
    title: "Events & gatherings",
    lead: "Explore workshops, community circles and learning experiences. Only confirmed dates appear in the event calendar.",
    placeholder: "Search by topic, location or event name...",
    search: "Find events", searchLabel: "Search public events",
    browse: "Explore by theme", browseHelp: "Choose a direction to see matching published events.",
    upcoming: "Upcoming events", past: "Past events", allFormats: "All formats", online: "Online", inPerson: "In person",
    filters: "Event format", all: "All", somatic: "Body & safety", connection: "Heart & connection", reiki: "Energy & Reiki", temple: "Temple studies",
    noDates: "No confirmed upcoming dates are published yet.", noDatesHelp: "The calendar will show dates and registration links after the organizer confirms them. The themes below are examples, not scheduled events.",
    noMatches: "No events match these filters.", noMatchesHelp: "Try another topic or show the full calendar.",
    reset: "Clear filters", view: "Event details & registration", onlineLocation: "Online", pastNote: "Past events are shown for reference, not for booking.",
    themes: "Event directions", themesIntro: "These are formats we work with. They do not imply a scheduled date.",
    explore: "Explore related services", academy: "Explore learning programs",
    themeSomatic: "Somatic circles", themeSomaticText: "Gentle awareness, boundaries and embodied safety.",
    themeConnection: "Connection & constellations", themeConnectionText: "Reflective group experiences for connection and relationships.",
    themeReiki: "Reiki & energy practice", themeReikiText: "Introductory practice circles and experiential learning.",
    themeTemple: "Temple studies", themeTempleText: "Symbolic traditions, meditation and cultural learning.",
  },
  ru: {
    kicker: "НАЙДИТЕ СВОЁ · HOLISTIC HOUSE",
    title: "События и встречи",
    lead: "Мастер-классы, групповые практики и обучающие встречи. В афише публикуются только подтверждённые даты.",
    placeholder: "Тема, город или название мероприятия...",
    search: "Найти события", searchLabel: "Поиск публичных мероприятий",
    browse: "Направления встреч", browseHelp: "Выберите тему, чтобы увидеть опубликованные события.",
    upcoming: "Ближайшие события", past: "Прошедшие события", allFormats: "Все форматы", online: "Онлайн", inPerson: "Очно",
    filters: "Формат мероприятий", all: "Все", somatic: "Тело и безопасность", connection: "Сердце и общение", reiki: "Энергия и Рейки", temple: "Храмовые практики",
    noDates: "Пока нет опубликованных подтверждённых дат.", noDatesHelp: "В афише появятся даты и ссылки для записи после подтверждения организатором. Темы ниже — примеры направлений, а не объявленные мероприятия.",
    noMatches: "По этим фильтрам событий нет.", noMatchesHelp: "Попробуйте другую тему или очистите фильтры.",
    reset: "Сбросить фильтры", view: "Описание и запись", onlineLocation: "Онлайн", pastNote: "Прошедшие встречи показаны для информации, не для записи.",
    themes: "Форматы встреч", themesIntro: "Эти направления возможны, но конкретная дата пока не заявлена.",
    explore: "Посмотреть услуги", academy: "Посмотреть программы обучения",
    themeSomatic: "Соматические круги", themeSomaticText: "Мягкие практики внимания к телу, границам и безопасности.",
    themeConnection: "Контакт и расстановки", themeConnectionText: "Групповые встречи для исследования отношений и связи с другими.",
    themeReiki: "Рейки и энергия", themeReikiText: "Вводные круги практики и знакомство с энергетическими направлениями.",
    themeTemple: "Храмовые традиции", themeTempleText: "Символика, медитация и изучение культурных практик.",
  },
  es: {
    kicker: "ENCUENTRA TU CAMINO · HOLISTIC HOUSE",
    title: "Eventos y encuentros",
    lead: "Talleres, círculos comunitarios y experiencias de aprendizaje. Solo mostramos fechas confirmadas.",
    placeholder: "Busca por tema, lugar o evento...",
    search: "Buscar eventos", searchLabel: "Buscar eventos públicos",
    browse: "Explora por tema", browseHelp: "Elige un área para ver eventos publicados.",
    upcoming: "Próximos eventos", past: "Eventos anteriores", allFormats: "Todos los formatos", online: "En línea", inPerson: "Presencial",
    filters: "Formato del evento", all: "Todos", somatic: "Cuerpo y seguridad", connection: "Corazón y conexión", reiki: "Energía y Reiki", temple: "Estudios del templo",
    noDates: "Todavía no hay fechas próximas confirmadas.", noDatesHelp: "Las fechas y enlaces de inscripción aparecerán después de la confirmación del organizador. Los temas de abajo no son eventos programados.",
    noMatches: "No hay eventos con estos filtros.", noMatchesHelp: "Prueba otro tema o restablece los filtros.",
    reset: "Borrar filtros", view: "Detalles e inscripción", onlineLocation: "En línea", pastNote: "Los eventos anteriores son informativos; no están disponibles para reservar.",
    themes: "Tipos de encuentros", themesIntro: "Son posibles formatos de actividades, no fechas anunciadas.",
    explore: "Explorar servicios", academy: "Explorar programas",
    themeSomatic: "Círculos somáticos", themeSomaticText: "Atención amable al cuerpo, límites y seguridad.",
    themeConnection: "Conexión y constelaciones", themeConnectionText: "Experiencias grupales de relaciones y conexión.",
    themeReiki: "Reiki y energía", themeReikiText: "Círculos introductorios y aprendizaje práctico.",
    themeTemple: "Estudios del templo", themeTempleText: "Tradiciones simbólicas, meditación y aprendizaje cultural.",
  },
} as const;

function renderSchedule(event: PublicEvent, locale: PublicLocale) {
  const date = new Date(event.startsAt);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-CA", {
      dateStyle: "medium", timeStyle: "short", timeZone: event.timeZone,
    }).format(date);
  } catch {
    return "";
  }
}

export function EventsDiscovery({ locale, events }: { locale: PublicLocale; events: readonly PublicEvent[] }) {
  const t = copy[locale];
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryChoice>("all");
  const [format, setFormat] = useState<FormatChoice>("all");
  const [past, setPast] = useState(false);
  const filtersActive = Boolean(search.trim()) || category !== "all" || format !== "all";
  const verified = events.filter(event => event.status === "published" && !Number.isNaN(Date.parse(event.startsAt)) && Boolean(event.registrationHref.trim()));
  const filtered = useMemo(() => {
    const now = Date.now();
    const term = search.trim().toLocaleLowerCase(locale);
    return verified.filter(event => {
      const starts = Date.parse(event.startsAt);
      if (past ? starts >= now : starts < now) return false;
      if (category !== "all" && event.category !== category) return false;
      if (format !== "all" && event.format !== format) return false;
      return !term || [
        ...Object.values(event.title), ...Object.values(event.description),
        event.city || "", event.location || "",
      ].join(" ").toLocaleLowerCase(locale).includes(term);
    }).sort((a,b) => past ? Date.parse(b.startsAt) - Date.parse(a.startsAt) : Date.parse(a.startsAt) - Date.parse(b.startsAt));
  }, [verified, past, category, format, search, locale]);
  const anyInPeriod = verified.some(event => past ? Date.parse(event.startsAt) < Date.now() : Date.parse(event.startsAt) >= Date.now());

  function reset() { setSearchText(""); setSearch(""); setCategory("all"); setFormat("all"); }

  return <div className={styles.root} data-events-discovery>
    <section className={styles.hero} aria-labelledby="hh-events-title">
      <div className={styles.topline}>
        <p className={styles.kicker}><Sparkles size={16} aria-hidden="true" />{t.kicker}</p>
        <DiscoverySectionTabs locale={locale} active="events" />
      </div>
      <h1 id="hh-events-title">{t.title}</h1>
      <p className={styles.lead}>{t.lead}</p>
      <form className={styles.form} role="search" onSubmit={event => { event.preventDefault(); setSearch(searchText.slice(0, 120)); }}>
        <label htmlFor="hh-events-search" className={styles.srOnly}>{t.searchLabel}</label>
        <input id="hh-events-search" type="search" value={searchText}
          onChange={event => { setSearchText(event.target.value); if (!event.target.value.trim()) setSearch(""); }}
          maxLength={120} autoComplete="off" placeholder={t.placeholder} />
        <button type="submit">{t.search}<Search size={19} aria-hidden="true" /></button>
      </form>
    </section>

    <section className={styles.filters} aria-labelledby="hh-events-browse">
      <div className={styles.stepHead}>
        <span className={styles.stepNumber} aria-hidden="true">1</span>
        <div><h2 id="hh-events-browse">{t.browse}</h2><p>{t.browseHelp}</p></div>
      </div>
      <div className={styles.categories} role="group" aria-label={t.browse}>
        {categoryIds.map(id => {
          const Icon = id === "all" ? CalendarDays : themeIcons[id];
          return <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}>
            <Icon aria-hidden="true" size={20} strokeWidth={1.8} /><span>{t[id]}</span>
          </button>;
        })}
      </div>
      <div className={styles.controls}>
        <div className={styles.periods} role="group" aria-label={t.upcoming}>
          <button type="button" aria-pressed={!past} onClick={() => setPast(false)}>{t.upcoming}</button>
          <button type="button" aria-pressed={past} onClick={() => setPast(true)}>{t.past}</button>
        </div>
        <label>{t.filters}
          <select value={format} onChange={event => setFormat(event.target.value as FormatChoice)}>
            <option value="all">{t.allFormats}</option>
            <option value="in_person">{t.inPerson}</option>
            <option value="online">{t.online}</option>
          </select>
        </label>
        {filtersActive && <button type="button" className={styles.reset} onClick={reset}>{t.reset} ×</button>}
      </div>
    </section>

    <section className={styles.results} aria-live="polite" aria-labelledby="hh-events-results">
      <div className={styles.resultHeading}><h2 id="hh-events-results">{past ? t.past : t.upcoming}</h2><span>{filtered.length}</span></div>
      {filtered.length ? <div className={styles.eventGrid}>
        {filtered.map(event => <article key={event.id} className={styles.eventCard}>
          <div className={styles.eventTop}><CalendarDays size={19} aria-hidden="true" /><strong>{renderSchedule(event,locale)}</strong></div>
          <h3>{event.title[locale]}</h3>
          <p>{event.description[locale]}</p>
          <div className={styles.eventLocation}><MapPin size={16} aria-hidden="true" />{event.format === "online" ? t.onlineLocation : [event.location,event.city].filter(Boolean).join(", ")}</div>
          {!past && (event.registrationHref.startsWith("/") ?
            <Link href={event.registrationHref} prefetch={false}>{t.view}<ArrowRight size={17} aria-hidden="true" /></Link> :
            <a href={event.registrationHref} target="_blank" rel="noopener noreferrer">{t.view}<ArrowRight size={17} aria-hidden="true" /></a>
          )}
        </article>)}
      </div> : <div className={styles.empty}>
        <CalendarDays size={28} strokeWidth={1.5} aria-hidden="true" />
        <h3>{anyInPeriod ? t.noMatches : t.noDates}</h3>
        <p>{anyInPeriod ? t.noMatchesHelp : t.noDatesHelp}</p>
        {past && <small>{t.pastNote}</small>}
      </div>}
    </section>

    <section className={styles.themeSection} aria-labelledby="hh-event-directions">
      <h2 id="hh-event-directions">{t.themes}</h2>
      <p>{t.themesIntro}</p>
      <div className={styles.themeGrid}>
        {(["somatic","connection","reiki","temple"] as const).map(id => {
          const Icon = themeIcons[id];
          const titles = { somatic: t.themeSomatic, connection: t.themeConnection, reiki: t.themeReiki, temple: t.themeTemple };
          const descriptions = { somatic: t.themeSomaticText, connection: t.themeConnectionText, reiki: t.themeReikiText, temple: t.themeTempleText };
          return <article key={id} className={styles.themeCard}><Icon size={23} strokeWidth={1.6} aria-hidden="true" />
            <h3>{titles[id]}</h3><p>{descriptions[id]}</p></article>;
        })}
      </div>
      <div className={styles.actions}>
        <Link href={"/"+locale+"/services"}>{t.explore}<ArrowRight size={17} aria-hidden="true" /></Link>
        <Link href={"/"+locale+"/academy"}>{t.academy}<ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
    </section>
  </div>;
}
