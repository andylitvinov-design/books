"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { DaoHexagramGlyph } from "./dao-hexagram-glyph";
import styles from "./dao-hexagrams.module.css";

export type DaoHexagramEntry = {
  number: number; hanzi: string; title: string; ru: string; en: string; es: string;
  upper: "heaven" | "earth" | "water" | "thunder" | "wind" | "fire" | "mountain" | "lake";
  lower: "heaven" | "earth" | "water" | "thunder" | "wind" | "fire" | "mountain" | "lake";
  photo: string; essence: string; author: boolean;
};

const copy = {
  ru: { search: "Найти гексаграмму", placeholder: "Номер, название, символ, стихия…", filter: "Материалы", all: "Все 64", author: "Авторские (12)", basic: "Справочные (52)", count: "карточек", authored: "Авторский текст", reference: "Справка", read: "Открыть карточку →", none: "Совпадений нет. Попробуйте другой запрос." },
  en: { search: "Find a hexagram", placeholder: "Number, name, Chinese character, element…", filter: "Content type", all: "All 64", author: "Original (12)", basic: "Reference (52)", count: "cards", authored: "Original text", reference: "Reference", read: "Open card →", none: "Nothing found. Try another search." },
  es: { search: "Buscar un hexagrama", placeholder: "Número, nombre, carácter o elemento…", filter: "Tipo de texto", all: "Los 64", author: "Originales (12)", basic: "Referencias (52)", count: "tarjetas", authored: "Texto del autor", reference: "Referencia", read: "Abrir tarjeta →", none: "Sin resultados. Prueba otra búsqueda." },
} as const;

export function DaoHexagramDirectory({ locale, entries }: {
  locale: "ru" | "en" | "es"; entries: DaoHexagramEntry[];
}) {
  const labels = copy[locale];
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "author" | "basic">("all");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const filtered = useMemo(() => entries.filter((item) => {
    if (kind === "author" && !item.author) return false;
    if (kind === "basic" && item.author) return false;
    if (!deferredQuery) return true;
    return [String(item.number), item.hanzi, item.title, item.ru, item.en, item.es, item.essence, item.upper, item.lower]
      .join(" ").toLocaleLowerCase().includes(deferredQuery);
  }), [deferredQuery, entries, kind]);

  return (
    <section aria-label={locale === "ru" ? "Справочник гексаграмм" : "I Ching directory"}>
      <div className={styles.tools}>
        <label className={styles.searchLabel} htmlFor="dao-hexagram-search">{labels.search}
          <input autoComplete="off" className={styles.search} id="dao-hexagram-search" type="search"
            value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.placeholder} />
        </label>
        <label className={styles.filterLabel} htmlFor="dao-hexagram-filter">{labels.filter}
          <select id="dao-hexagram-filter" className={styles.filter} value={kind}
            onChange={(event) => setKind(event.target.value as "all" | "author" | "basic")}>
            <option value="all">{labels.all}</option>
            <option value="author">{labels.author}</option>
            <option value="basic">{labels.basic}</option>
          </select>
        </label>
      </div>
      <p className={styles.counter} role="status" aria-live="polite">{filtered.length} {labels.count}</p>
      {filtered.length ? (
        <div className={styles.grid}>
          {filtered.map((item) => (
            <Link key={item.number} className={styles.card} href={"/" + locale + "/dao/hexagrams/" + item.number}>
              <div className={styles.cardPhoto}>
                {/* First-party, low-byte source photos; loaded only near the viewport. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.photo} alt={item.author
                  ? (locale === "ru" ? "Фото из авторской публикации" : "Original author's post image")
                  : (locale === "ru" ? "Тематическое фото из архива Дао" : "Thematic image from the Dao archive")}
                  loading="lazy" decoding="async" />
                <span className={styles.cardSymbol}><DaoHexagramGlyph upper={item.upper} lower={item.lower} label={"Hexagram " + item.number} /></span>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardMeta}>
                  <span>№ {String(item.number).padStart(2, "0")} · {item.hanzi}</span>
                  <span className={item.author ? styles.authorBadge : styles.referenceBadge}>{item.author ? labels.authored : labels.reference}</span>
                </div>
                <h2>{item.title}</h2>
                <p>{item.essence}</p>
                <span className={styles.cardFooter}>{labels.read}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : <p className={styles.empty} role="status">{labels.none}</p>}
    </section>
  );
}
