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
    "eyebrow": "EXPLORE BY TOPIC",
    "title": "Find your focus",
    "intro": "Choose a subject instead of seeing the same services again.",
    "energy": "Energy",
    "love": "Love & relationships",
    "business": "Business & career",
    "services": "All services",
    "courses": "All courses",
    "help": "Need help choosing? Ask a question"
  },
  "ru": {
    "eyebrow": "ФИЛЬТРЫ ПО ТЕМЕ",
    "title": "Подобрать по направлению",
    "intro": "Выберите интересующую тему без повторения предложений.",
    "energy": "Энергия",
    "love": "Любовь и отношения",
    "business": "Бизнес и карьера",
    "services": "Все услуги",
    "courses": "Все курсы",
    "help": "Нужна помощь с выбором? Задать вопрос"
  },
  "es": {
    "eyebrow": "FILTRAR POR TEMA",
    "title": "Encontrar mi tema",
    "intro": "Elige un tema sin repetir las mismas ofertas.",
    "energy": "Energía",
    "love": "Amor y relaciones",
    "business": "Negocios y carrera",
    "services": "Todos los servicios",
    "courses": "Todos los cursos",
    "help": "¿Necesitas ayuda para elegir? Haz una pregunta"
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
        <Link href={"/" + locale + "/services"} prefetch={false} className={styles.chip} data-home-topic-filter="services">{t.services}</Link>
        <Link href={"/" + locale + "/academy"} prefetch={false} className={styles.chip} data-home-topic-filter="courses">{t.courses}</Link>
      </nav>
      <details className={styles.ask} data-home-more-deferred="true"
        onToggle={event => setExpanded(event.currentTarget.open)}>
        <summary>{t.help}<span aria-hidden="true">↓</span></summary>
        {expanded ? <HomeConversationGuide locale={locale} /> : null}
      </details>
    </section>
  );
}
