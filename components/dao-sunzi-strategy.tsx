import { getSunTzuStrategy } from "@/data/dao-sunzi-strategies.mjs";
import styles from "./dao-sunzi-strategy.module.css";

type Locale = "ru" | "en" | "es";
const labels = {
  ru: { heading: "Стратегия Сунь-цзы", book: "Сунь-цзы, «Искусство войны»", chapter: "глава", strategy: "Ваша стратегия", note: "Смысловая параллель, не традиционное соответствие И-цзин и Сунь-цзы." },
  en: { heading: "Sun Tzu's strategy", book: "Sun Tzu, The Art of War", chapter: "chapter", strategy: "Your strategy", note: "Editorial thematic parallel, not a traditional I Ching correspondence." },
  es: { heading: "Estrategia de Sun Tzu", book: "Sun Tzu, El arte de la guerra", chapter: "capítulo", strategy: "Tu estrategia", note: "Correspondencia temática editorial, no un vínculo tradicional del I Ching." },
} as const;

/** A sourced, compact alternative to the previous unsourced Sunzi pastiche. */
export function DaoSunTzuStrategy({ number, locale }: { number: number; locale: Locale }) {
  const entry = getSunTzuStrategy(number, locale);
  if (!entry) return null;
  const t = labels[locale];
  return (
    <section className={styles.block} aria-label={t.heading}>
      <h3>⚔️ {t.heading} · {locale === "ru" ? "Гексаграмма" : locale === "es" ? "Hexagrama" : "Hexagram"} {number}</h3>
      <blockquote>«{entry.quote}»</blockquote>
      <small className={styles.source}>— {t.book}, {t.chapter} {entry.chapter}. <a href={entry.source} target="_blank" rel="noopener noreferrer" title={entry.original}>{locale === "ru" ? "Оригинал ↗" : locale === "es" ? "Original ↗" : "Original ↗"}</a></small>
      <p><strong>{t.strategy}:</strong> {entry.strategy}</p>
      <small className={styles.note}>{t.note}</small>
    </section>
  );
}
