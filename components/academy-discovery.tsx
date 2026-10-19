"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { ArrowRight, Search, Sparkles } from "lucide-react";

import { AcademyCourseCardList, type AcademyCourseItem } from "@/components/academy-course-card-list";
import { DiscoverySectionTabs } from "@/components/discovery-section-tabs";
import type { AcademyView } from "@/data/academy/catalog";
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

export function AcademyDiscovery({
  locale,
  view,
  items,
  label,
}: {
  locale: PublicLocale;
  view: AcademyView;
  items: AcademyCourseItem[];
  label: string;
}) {
  const t = COPY[locale];
  const [query, setQuery] = useState("");
  const terms = useMemo(() => searchTerms(query), [query]);
  const matchedItems = useMemo(() => items.filter((item) =>
    matchesTerms([item.title, item.subtitle, item.description, SEARCH_KEYWORDS[item.id]].filter(Boolean).join(" "), terms),
  ), [items, terms]);
  const isSearching = Boolean(query.trim());

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
      </section>
      {view === "programs" ? (
        <section className={styles.results} id="academy-programs" aria-label={label}>
          <div className={styles.listHeading}>
            <div>
              <p className={styles.listKicker}>{t.catalogLabel}</p>
              <h2>{t.browse}</h2>
            </div>
            {isSearching ? (
              <button type="button" className={styles.reset} onClick={() => setQuery("")}>{t.reset}</button>
            ) : (
              <span className={styles.count}>{items.length} {t.count}</span>
            )}
          </div>
          {matchedItems.length ? (
            <AcademyCourseCardList locale={locale} items={matchedItems} label={label} />
          ) : (
            <p className={styles.empty} role="status">{t.empty}</p>
          )}
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
