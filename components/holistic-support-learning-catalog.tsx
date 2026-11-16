"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, ChevronDown, Filter, GraduationCap, Search, SlidersHorizontal, X } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-learning-catalog.module.css";

export type LearningDirection = "reiki" | "temple" | "magic";
export type LearningCost = "free" | "priced" | "ask" | "archive";
export type LearningKind = "course" | "program" | "initiation" | "video";
export type LearningCatalogItem = {
  id: string;
  direction: LearningDirection;
  topic: string;
  title: string;
  description: string;
  href: string;
  image?: string;
  teacher?: string;
  language?: PublicLocale;
  kind: LearningKind;
  cost: LearningCost;
  price?: { amount: number; currency: string };
  lessons?: number;
};

const directionOrder: LearningDirection[] = ["reiki", "temple", "magic"];
const directionImages: Record<LearningDirection, string> = {
  reiki: "/academy/reiki-yggdrasil/source/basic-program.jpg",
  temple: "/academy/reiki-yggdrasil/source/temple-studies.png",
  magic: "/academy/reiki-yggdrasil/source/advanced-runes.png",
};
const topics: Record<LearningDirection, string[]> = {
  reiki: ["all", "usui", "tantra", "kundalini", "yggdrasil", "other"],
  temple: ["all", "egypt", "greece", "maya", "other"],
  magic: ["all", "runes", "tarot", "rituals", "other"],
};
const copy = {
  ru: {
    title: "Курсы и обучение", intro: "Выбери направление, затем уточни тему. Все фильтры работают прямо здесь.",
    directions: { reiki: "Рейки", temple: "Храмовые практики", magic: "Магия, руны и Таро" },
    topics: { all: "Все темы", usui: "Усуи", tantra: "Тантра Рейки", kundalini: "Кундалини",
      yggdrasil: "Иггдрасиль", egypt: "Египет", greece: "Греция", maya: "Майя",
      runes: "Руны", tarot: "Таро", rituals: "Магия и ритуалы", other: "Другие" },
    search: "Найти курс или мастера", filters: "Фильтры", closeFilters: "Свернуть фильтры",
    all: "Все", free: "Бесплатно", paid: "Платно", unknown: "Цена не указана",
    archive: "Архив · набор не подтверждён", price: "Стоимость", kind: "Формат",
    master: "Мастер", language: "Язык", allMasters: "Все мастера", allLanguages: "Все языки",
    allKinds: "Все форматы", kinds: { course: "Курс", program: "Программа", initiation: "Инициация", video: "Видеоуроки" },
    results: "Предложения", items: "вариантов", details: "О программе", hide: "Свернуть",
    open: "Открыть", start: "Начать бесплатно", more: "Показать ещё", empty: "По этим фильтрам предложений пока нет.",
    reset: "Сбросить фильтры", contact: "Стоимость и запись уточняются у мастера. Заявка не означает оплату или подтверждённое место.",
    archiveNote: "Архивные материалы доступны для изучения, но набор и цена не подтверждены.",
    teacher: "Мастер", source: "Материалы Академии", lessons: "уроков",
  },
  en: {
    title: "Courses & learning", intro: "Choose a direction, then narrow the topic. All filters work on this page.",
    directions: { reiki: "Reiki", temple: "Temple practices", magic: "Magic, runes & Tarot" },
    topics: { all: "All topics", usui: "Usui", tantra: "Tantra Reiki", kundalini: "Kundalini",
      yggdrasil: "Yggdrasil", egypt: "Egypt", greece: "Greece", maya: "Maya",
      runes: "Runes", tarot: "Tarot", rituals: "Magic & rituals", other: "Other" },
    search: "Find a course or teacher", filters: "Filters", closeFilters: "Hide filters",
    all: "All", free: "Free", paid: "Paid", unknown: "Price not listed",
    archive: "Archive · enrollment unconfirmed", price: "Price", kind: "Format",
    master: "Teacher", language: "Language", allMasters: "All teachers", allLanguages: "All languages",
    allKinds: "All formats", kinds: { course: "Course", program: "Program", initiation: "Initiation", video: "Video lessons" },
    results: "Learning options", items: "options", details: "About this program", hide: "Collapse",
    open: "Explore", start: "Start free", more: "Show more", empty: "No learning options match these filters yet.",
    reset: "Clear filters", contact: "Check the price and enrollment directly with the teacher. A request is not a payment or confirmed place.",
    archiveNote: "Archive material can be explored, but current enrollment and pricing are unconfirmed.",
    teacher: "Teacher", source: "Academy materials", lessons: "lessons",
  },
  es: {
    title: "Cursos y formación", intro: "Elige un área y luego un tema. Todos los filtros funcionan aquí mismo.",
    directions: { reiki: "Reiki", temple: "Prácticas de templo", magic: "Magia, runas y Tarot" },
    topics: { all: "Todos los temas", usui: "Usui", tantra: "Tantra Reiki", kundalini: "Kundalini",
      yggdrasil: "Yggdrasil", egypt: "Egipto", greece: "Grecia", maya: "Maya",
      runes: "Runas", tarot: "Tarot", rituals: "Magia y rituales", other: "Otros" },
    search: "Buscar curso o maestro", filters: "Filtros", closeFilters: "Ocultar filtros",
    all: "Todos", free: "Gratis", paid: "De pago", unknown: "Precio no publicado",
    archive: "Archivo · inscripción sin confirmar", price: "Precio", kind: "Formato",
    master: "Maestro", language: "Idioma", allMasters: "Todos los maestros", allLanguages: "Todos los idiomas",
    allKinds: "Todos los formatos", kinds: { course: "Curso", program: "Programa", initiation: "Iniciación", video: "Vídeolecciones" },
    results: "Opciones formativas", items: "opciones", details: "Sobre el programa", hide: "Ocultar",
    open: "Explorar", start: "Empezar gratis", more: "Ver más", empty: "Todavía no hay opciones para estos filtros.",
    reset: "Borrar filtros", contact: "Consulta el precio y la inscripción con el maestro. Una solicitud no es un pago ni una plaza confirmada.",
    archiveNote: "El material del archivo se puede explorar, pero la inscripción y el precio no están confirmados.",
    teacher: "Maestro", source: "Materiales de la Academia", lessons: "lecciones",
  },
} as const;

export function HolisticSupportLearningCatalog({ locale, items }: {
  locale: PublicLocale; items: LearningCatalogItem[];
}) {
  const t = copy[locale];
  const [direction, setDirection] = useState<LearningDirection>("reiki");
  const [topic, setTopic] = useState("all");
  const [query, setQuery] = useState("");
  const [cost, setCost] = useState<"all" | "free" | "paid" | "ask">("all");
  const [kind, setKind] = useState<"all" | LearningKind>("all");
  const [teacher, setTeacher] = useState("all");
  const [language, setLanguage] = useState<"all" | PublicLocale>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [limit, setLimit] = useState(8);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const withinDirection = useMemo(() => items.filter(item => item.direction === direction), [items, direction]);
  const masters = useMemo(() => [...new Set(withinDirection.map(item => item.teacher).filter((v): v is string => Boolean(v)))].sort(), [withinDirection]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return withinDirection.filter(item =>
      (topic === "all" || item.topic === topic) &&
      (cost === "all" || (cost === "paid" ? item.cost === "priced" : cost === "ask" ?
        item.cost === "ask" || item.cost === "archive" : item.cost === "free")) &&
      (kind === "all" || item.kind === kind) &&
      (teacher === "all" || item.teacher === teacher) &&
      (language === "all" || item.language === language) &&
      (!needle || [item.title, item.description, item.teacher ?? ""].join(" ").toLocaleLowerCase(locale).includes(needle))
    );
  }, [withinDirection, topic, cost, kind, teacher, language, query, locale]);

  const reset = () => { setTopic("all"); setCost("all"); setKind("all"); setTeacher("all");
    setLanguage("all"); setQuery(""); setLimit(8); setExpanded(null); };
  const chooseDirection = (next: LearningDirection) => { setDirection(next); reset(); };
  const toggleExpanded = (id: string) => setExpanded(current => current === id ? null : id);
  const priceLabel = (item: LearningCatalogItem) => item.cost === "free" ? t.free :
    item.cost === "archive" ? t.archive :
    item.cost === "priced" && item.price ?
      new Intl.NumberFormat(locale, { style: "currency", currency: item.price.currency }).format(item.price.amount) :
      t.unknown;

  return <section className={styles.root} data-support-learning-catalog aria-labelledby="support-learning-title">
    <header className={styles.heading}>
      <div><span className={styles.eyebrow}><GraduationCap size={17} aria-hidden="true" /> HOLISTIC HOUSE · ACADEMY</span>
        <h2 id="support-learning-title">{t.title}</h2><p>{t.intro}</p></div>
    </header>
    <div className={styles.directions} role="group" aria-label={t.title}>
      {directionOrder.map(id => <button type="button" key={id} className={styles.direction}
        data-learning-direction={id} aria-pressed={direction === id}
        onClick={() => chooseDirection(id)}>
        <Image src={directionImages[id]} fill sizes="(max-width: 640px) 32vw, 250px" alt="" />
        <span>{t.directions[id]}</span>
      </button>)}
    </div>
    <div className={styles.topics} role="group" aria-label={t.topics.all}>
      {topics[direction].map(id => <button type="button" key={id} className={styles.topic}
        data-learning-topic={id} aria-pressed={topic === id}
        onClick={() => { setTopic(id); setLimit(8); setExpanded(null); }}>
        {t.topics[id as keyof typeof t.topics]}
      </button>)}
    </div>
    <div className={styles.searchRow}>
      <label className={styles.search}><Search size={17} aria-hidden="true" />
        <span className={styles.srOnly}>{t.search}</span>
        <input type="search" value={query} placeholder={t.search} onChange={event => { setQuery(event.target.value); setLimit(8); }} />
      </label>
      <button type="button" className={styles.filterToggle} aria-expanded={filtersOpen}
        aria-controls="support-learning-filters" onClick={() => setFiltersOpen(open => !open)}
        data-learning-filters-toggle><SlidersHorizontal size={18} aria-hidden="true" />{filtersOpen ? t.closeFilters : t.filters}
        <ChevronDown size={14} aria-hidden="true" /></button>
    </div>
    <div className={styles.costRow} role="group" aria-label={t.price}>
      {(["all", "free", "paid", "ask"] as const).map(value => <button type="button" key={value}
        data-learning-cost={value} aria-pressed={cost === value}
        onClick={() => { setCost(value); setLimit(8); }}>
        {value === "all" ? t.all : value === "free" ? t.free : value === "paid" ? t.paid : t.unknown}
      </button>)}
    </div>
    <div id="support-learning-filters" className={styles.extraFilters} hidden={!filtersOpen}>
      <label>{t.kind}<select value={kind} onChange={event => { setKind(event.target.value as typeof kind); setLimit(8); }}>
        <option value="all">{t.allKinds}</option>
        {(["course", "program", "initiation", "video"] as const).map(id =>
          <option value={id} key={id}>{t.kinds[id]}</option>)}
      </select></label>
      <label>{t.master}<select data-learning-master value={teacher} onChange={event => { setTeacher(event.target.value); setLimit(8); }}>
        <option value="all">{t.allMasters}</option>{masters.map(name => <option value={name} key={name}>{name}</option>)}
      </select></label>
      <label>{t.language}<select value={language} onChange={event => { setLanguage(event.target.value as typeof language); setLimit(8); }}>
        <option value="all">{t.allLanguages}</option><option value="en">EN</option><option value="ru">RU</option><option value="es">ES</option>
      </select></label>
      <button type="button" className={styles.reset} onClick={reset}><X size={15} aria-hidden="true" />{t.reset}</button>
    </div>
    <div className={styles.resultsHeading}>
      <h3>{t.results} <span data-learning-count role="status">{filtered.length} {t.items}</span></h3>
      <button type="button" className={styles.clear} onClick={reset}><Filter size={14} aria-hidden="true" />{t.reset}</button>
    </div>
    {filtered.length ? <div className={styles.results} role="list" aria-label={t.results}>
      {filtered.slice(0, limit).map(item => <article role="listitem" className={styles.card} key={item.id}
        data-learning-item={item.id}>
        <div className={styles.cardMain}>
          {item.image ? <div className={styles.cardImage}><Image src={item.image} alt="" fill
            sizes="(max-width: 640px) 96px, 142px" unoptimized /></div> :
            <div className={styles.cardImagePlaceholder}><BookOpen size={32} aria-hidden="true" /></div>}
          <div className={styles.cardBody}>
            <div className={styles.meta}><span>{t.kinds[item.kind]}</span>
              <strong data-learning-price={item.cost}>{priceLabel(item)}</strong></div>
            <h4>{item.title}</h4>
            <p className={styles.subline}>{item.teacher ? t.teacher + ": " + item.teacher : t.source}
              {item.language ? " · " + item.language.toUpperCase() : ""}
              {typeof item.lessons === "number" ? " · " + item.lessons + " " + t.lessons : ""}</p>
            <div className={styles.actions}>
              <button type="button" onClick={() => toggleExpanded(item.id)}
                aria-expanded={expanded === item.id} aria-controls={"learning-details-" + item.id}>
                {expanded === item.id ? t.hide : t.details}<ChevronDown size={15} aria-hidden="true" /></button>
              <Link href={item.href} prefetch={false}>{item.cost === "free" ? t.start : t.open}
                <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
        <div className={styles.detail} id={"learning-details-" + item.id} hidden={expanded !== item.id}>
          <p>{item.description}</p>
          {item.cost === "archive" ? <p>{t.archiveNote}</p> :
            item.cost === "ask" ? <p>{t.contact}</p> : null}
        </div>
      </article>)}
      {filtered.length > limit ? <button type="button" className={styles.more} onClick={() => setLimit(n => n + 8)}>
        {t.more} <ArrowRight size={15} aria-hidden="true" /></button> : null}
    </div> : <div className={styles.empty} role="status">
      <p>{t.empty}</p><button type="button" onClick={reset}>{t.reset}</button></div>}
  </section>;
}
