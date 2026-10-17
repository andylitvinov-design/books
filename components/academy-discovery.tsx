"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { ArrowRight, Search, Sparkles } from "lucide-react";

import { CatalogShowcase, type CatalogShowcaseItem } from "@/components/catalog-showcase";
import type { AcademyView } from "@/data/academy/catalog";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./academy-discovery.module.css";

type Topic = "all" | "reiki" | "temple" | "stress";
type StartingPoint = "all" | "free" | "full";

const COPY = {
  en: {
    eyebrow: "HOLISTIC HOUSE · ACADEMY",
    title: "Find your learning path",
    description: "Explore Reiki, energywork and Temple Studies. Choose a free introduction or a complete learning program.",
    videoTitle: "Explore video lessons",
    videoDescription: "Find original lessons and guided practices, organized by program and recording language.",
    programs: "Programs", videos: "Videos", freeAiCourses: "Free AI Courses", aiShort: "AI Courses",
    placeholder: "e.g. Reiki, Tantra, Temple Studies or stress relief...",
    searchLabel: "Search learning programs",
    searchButton: "Find my course",
    topic: "Topic", topicAll: "All topics", reiki: "Reiki & energy", temple: "Temple Studies", stress: "Stress relief",
    start: "Starting point", startAll: "Any", free: "Free introduction", full: "Full program",
    suggestions: "You could try",
    picks: ["Free introduction", "Reiki Yggdrasil", "Tantra Reiki", "Temple Studies"],
    tantra: "Explore Tantra Reiki: free Level 1 initiation",
    local: "Browse without signing up. Matching happens here in your browser.",
    noResults: "No matching programs. Try another topic or clear the filters.",
    reset: "Show all programs", resultCount: "programs found",
    opora: "OPORA Stress Relief — free 14-day course", oporaAction: "Explore the free course",
    videoButton: "Browse video lessons",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · АКАДЕМИЯ",
    title: "Найдите свою программу обучения",
    description: "Изучайте Рейки, энергопрактики и храмовые традиции. Начните бесплатно или выберите полную программу.",
    videoTitle: "Выберите видеоуроки",
    videoDescription: "Уроки и практики по программам с указанием языка оригинальной записи.",
    programs: "Программы", videos: "Видео", freeAiCourses: "Бесплатные ИИ-курсы", aiShort: "ИИ-курсы",
    placeholder: "Например: Рейки, Тантра, мистерии или антистресс…",
    searchLabel: "Поиск учебных программ",
    searchButton: "Подобрать курс",
    topic: "Тема", topicAll: "Все темы", reiki: "Рейки и энергия", temple: "Храмовые традиции", stress: "Антистресс",
    start: "Начало обучения", startAll: "Любое", free: "Бесплатное введение", full: "Полная программа",
    suggestions: "Можно начать с",
    picks: ["Бесплатный курс", "Рейки Иггдрасиль", "Тантра Рейки", "Храмовые практики"],
    tantra: "Тантра Рейки: бесплатная инициация 1-й ступени",
    local: "Просмотр без регистрации. Подбор выполняется прямо в браузере.",
    noResults: "Подходящих программ нет. Попробуйте другую тему или сбросьте фильтры.",
    reset: "Показать все программы", resultCount: "найдено программ",
    opora: "ОПОРА — бесплатный антистресс-курс на 14 дней", oporaAction: "Открыть курс",
    videoButton: "Смотреть видеоуроки",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · ACADEMIA",
    title: "Encuentra tu ruta de aprendizaje",
    description: "Explora Reiki, trabajo energético y Temple Studies. Empieza gratis o elige un programa completo.",
    videoTitle: "Explora las videolecciones",
    videoDescription: "Lecciones y prácticas organizadas por programa e idioma de grabación original.",
    programs: "Programas", videos: "Videos", freeAiCourses: "Cursos de IA gratuitos", aiShort: "Cursos IA",
    placeholder: "Por ejemplo: Reiki, Tantra, tradiciones o antiestrés…",
    searchLabel: "Buscar programas de aprendizaje",
    searchButton: "Encontrar curso",
    topic: "Tema", topicAll: "Todos", reiki: "Reiki y energía", temple: "Temple Studies", stress: "Antiestrés",
    start: "Punto de partida", startAll: "Cualquiera", free: "Introducción gratuita", full: "Programa completo",
    suggestions: "Puedes empezar por",
    picks: ["Introducción gratis", "Reiki Yggdrasil", "Tantra Reiki", "Temple Studies"],
    tantra: "Tantra Reiki: iniciación gratuita de Nivel 1",
    local: "Explora sin registrarte. La búsqueda se realiza en tu navegador.",
    noResults: "No hay programas para estos filtros. Prueba otro tema o restablece la búsqueda.",
    reset: "Mostrar todos", resultCount: "programas encontrados",
    opora: "OPORA Antiestrés — curso gratuito de 14 días", oporaAction: "Explorar el curso",
    videoButton: "Ver las videolecciones",
  },
} as const;

const PROGRAM_META: Record<string, { topic: "reiki" | "temple"; start: "free" | "full"; keywords: string }> = {
  "academy-featured-principles-energywork": {
    topic: "reiki", start: "free",
    keywords: "free introduction level 1 initiation basic principles reikí reiki energywork энергетическая работа бесплатный вводный курс первая ступень инициация energía iniciación",
  },
  "academy-featured-yggdrasil": {
    topic: "reiki", start: "full",
    keywords: "dao yggdrasil basic course training levels реики рейки иггдрасиль базовый курс reiki yggdrasil curso básico",
  },
  "academy-featured-tantra-reiki": {
    topic: "reiki", start: "full",
    keywords: "tantra reiki nine levels tantra рейки тантра ступени training iniciación",
  },
  "academy-featured-kundalini-reiki": {
    topic: "reiki", start: "full",
    keywords: "kundalini reiki master кундалини рейки курсы kundalini",
  },
  "academy-featured-temple-studies": {
    topic: "temple", start: "full",
    keywords: "temple studies archetypes mysticism rituals tarot runes храмовые традиции мистерии таро руны храмовая практика tradiciones templo misterios",
  },
};

const STRESS_SEARCH = "stress relief opora antistress antiestrés estrés anti-stress stress-relief стресс антистресс опора тревога estrés cotidiano";
const searchTerms = (text: string) => text.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
const matchesTerms = (haystack: string, terms: string[]) =>
  terms.every((term) => haystack.toLocaleLowerCase().includes(term));

export function AcademyDiscovery({
  locale,
  view,
  items,
  label,
  children,
}: {
  locale: PublicLocale;
  view: AcademyView;
  items: CatalogShowcaseItem[];
  label: string;
  children: ReactNode;
}) {
  const t = COPY[locale];
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic>("all");
  const [startingPoint, setStartingPoint] = useState<StartingPoint>("all");
  const terms = useMemo(() => searchTerms(query), [query]);
  const matchedItems = useMemo(() => items.filter((item) => {
    const meta = PROGRAM_META[item.id];
    if (topic === "stress" || (topic !== "all" && meta?.topic !== topic)) return false;
    if (startingPoint !== "all" && meta?.start !== startingPoint) return false;
    return matchesTerms([item.title, item.subtitle, item.description, meta?.keywords].filter(Boolean).join(" "), terms);
  }), [items, topic, startingPoint, terms]);
  const matchingStress = (topic === "all" || topic === "stress")
    && (startingPoint === "all" || startingPoint === "free")
    && (topic === "stress" || terms.length > 0)
    && matchesTerms(STRESS_SEARCH + " " + t.opora, terms);
  const hasFilters = Boolean(query.trim()) || topic !== "all" || startingPoint !== "all";

  function scrollToResults() {
    const target = document.getElementById("academy-programs");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "start" });
  }

  function choosePick(index: number) {
    setQuery("");
    setTopic(index === 3 ? "temple" : "reiki");
    setStartingPoint(index === 0 ? "free" : "all");
    if (index === 1) setQuery("yggdrasil");
    if (index === 2) setQuery("tantra");
    scrollToResults();
  }

  function reset() {
    setQuery("");
    setTopic("all");
    setStartingPoint("all");
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
          <nav className={styles.tabs} aria-label={locale === "ru" ? "Разделы Академии" : locale === "es" ? "Secciones de la Academia" : "Academy sections"}>
            <Link aria-current={view === "programs" ? "page" : undefined} href={"/" + locale + "/academy"}>{t.programs}</Link>
            <Link aria-current={view === "videos" ? "page" : undefined} href={"/" + locale + "/academy?view=videos"}>{t.videos}</Link>
            <Link href={"/" + locale + "/academy/free-ai-courses"} aria-label={t.freeAiCourses}><span className={styles.aiLong}>{t.freeAiCourses}</span><span className={styles.aiShort}>{t.aiShort}</span></Link>
          </nav>
        </div>
        <h1 id="academy-discovery-title">{view === "videos" ? t.videoTitle : t.title}</h1>
        <p className={styles.intro}>{view === "videos" ? t.videoDescription : t.description}</p>

        {view === "programs" ? (
          <>
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
              <button className={styles.submit} type="submit">{t.searchButton}<Search aria-hidden="true" size={19} /></button>
            </form>
            <div className={styles.filters}>
              <label>{t.topic}
                <select value={topic} onChange={(event) => setTopic(event.target.value as Topic)}>
                  <option value="all">{t.topicAll}</option>
                  <option value="reiki">{t.reiki}</option>
                  <option value="temple">{t.temple}</option>
                  <option value="stress">{t.stress}</option>
                </select>
              </label>
              <label>{t.start}
                <select value={startingPoint} onChange={(event) => setStartingPoint(event.target.value as StartingPoint)}>
                  <option value="all">{t.startAll}</option>
                  <option value="free">{t.free}</option>
                  <option value="full">{t.full}</option>
                </select>
              </label>
            </div>
            <div className={styles.suggestions}>
              <span>{t.suggestions}:</span>
              {t.picks.map((pick, index) => (
                <button type="button" key={pick} onClick={() => choosePick(index)}>{pick}</button>
              ))}
            </div>
            <p className={styles.subnote}>{t.local}</p>
          </>
        ) : (
          <Link className={styles.videoLink} href="#academy-video-courses">{t.videoButton}<ArrowRight aria-hidden="true" size={19} /></Link>
        )}
        <Link className={styles.freeLink} href={"/" + locale + "/academy/reiki/tantra-reiki/free-initiation"}>
          {t.tantra} <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </section>

      {children}

      {view === "programs" ? (
        <section className={styles.results} id="academy-programs" aria-label={label}>
          {hasFilters ? (
            <div className={styles.resultsHeading} aria-live="polite">
              <span>{matchedItems.length + (matchingStress ? 1 : 0)} {t.resultCount}</span>
              <button type="button" onClick={reset}>{t.reset}</button>
            </div>
          ) : null}
          {matchingStress ? (
            <Link className={styles.stressResult} href={"/" + locale + "/courses/antistress"}>
              <span><strong>{t.opora}</strong><small>{t.oporaAction}</small></span><ArrowRight aria-hidden="true" />
            </Link>
          ) : null}
          {matchedItems.length ? <CatalogShowcase items={matchedItems} label={label} /> : null}
          {!matchedItems.length && !matchingStress ? <p className={styles.empty}>{t.noResults}</p> : null}
        </section>
      ) : null}
    </>
  );
}
