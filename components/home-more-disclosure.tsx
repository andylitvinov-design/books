"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-more-disclosure.module.css";

// Optional conversation guidance loads only on explicit intent; old repeated
// promotional cards are still available on their dedicated existing pages.
const HomeConversationGuide = dynamic(
  () => import("./home-conversation-guide").then(mod => mod.HomeConversationGuide),
  { ssr: false },
);
const copy = {
  "en": {
    "eyebrow": "CHOOSE YOUR DIRECTION",
    "title": "Explore by topic",
    "intro": "What would you like to focus on today?",
    "energy": "Energy",
    "love": "Love & relationships",
    "business": "Business & career",
    "temple": "Temple Support",
    "services": "All services",
    "courses": "All courses",
    "testGuide": "How free self-checks work",
    "help": "Not sure? Ask a question"
  },
  "ru": {
    "eyebrow": "ВЫБЕРИТЕ НАПРАВЛЕНИЕ",
    "title": "Выберите тему",
    "intro": "Что для вас сейчас важнее всего?",
    "energy": "Энергия",
    "love": "Любовь и отношения",
    "business": "Бизнес и карьера",
    "temple": "Temple Support",
    "services": "Все услуги",
    "courses": "Все курсы",
    "testGuide": "Как работают бесплатные тесты",
    "help": "Не знаете, что выбрать? Спросите"
  },
  "es": {
    "eyebrow": "ELIGE TU DIRECCIÓN",
    "title": "Explora por tema",
    "intro": "¿Qué te gustaría explorar hoy?",
    "energy": "Energía",
    "love": "Amor y relaciones",
    "business": "Negocios y carrera",
    "temple": "Temple Support",
    "services": "Todos los servicios",
    "courses": "Todos los cursos",
    "testGuide": "Cómo funcionan las pruebas",
    "help": "¿Dudas? Haz una pregunta"
  }
} as const;

export function HomeMoreDisclosure({ locale }: { locale: PublicLocale }) {
  const [expanded, setExpanded] = useState(false);
  const t = copy[locale];
  return (
    <section className={styles.root} data-home-topic-filters aria-labelledby="hh-home-topic-filters-title">
      <header className={styles.heading}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id="hh-home-topic-filters-title">{t.title}</h2>
        <p>{t.intro}</p>
      </header>
      <nav className={styles.filters} aria-label={t.title}>
        <Link href={"/" + locale + "/explore/energy"} prefetch={false} className={styles.chip} data-home-topic-filter="energy">{t.energy}</Link>
        <Link href={"/" + locale + "/explore/love"} prefetch={false} className={styles.chip} data-home-topic-filter="love">{t.love}</Link>
        <Link href={"/" + locale + "/explore/business"} prefetch={false} className={styles.chip} data-home-topic-filter="business">{t.business}</Link>
        <Link href={"/" + locale + "/temple-support"} prefetch={false} className={styles.chip} data-home-topic-filter="temple">{t.temple}</Link>
      </nav>
      <div className={styles.footer}>
        <nav className={styles.catalog} aria-label={locale === "ru" ? "Каталоги" : locale === "es" ? "Catálogos" : "Browse catalogues"}>
          <Link href={"/" + locale + "/services"} prefetch={false} className={styles.catalogLink} data-home-topic-filter="services">{t.services}<span aria-hidden="true">↗</span></Link>
          <Link href={"/" + locale + "/academy"} prefetch={false} className={styles.catalogLink} data-home-topic-filter="courses">{t.courses}<span aria-hidden="true">↗</span></Link>
          <Link href={"/" + locale + "/tests"} prefetch={false} className={styles.catalogLink} data-home-test-guide>{t.testGuide}<span aria-hidden="true">↗</span></Link>
        </nav>
        <details className={styles.ask} data-home-more-deferred="true"
          onToggle={event => setExpanded(event.currentTarget.open)}>
          <summary>{t.help}<span aria-hidden="true">↓</span></summary>
          {expanded ? <HomeConversationGuide locale={locale} /> : null}
        </details>
      </div>
    </section>
  );
}
