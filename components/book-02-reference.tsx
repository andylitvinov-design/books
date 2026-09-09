"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { RemedyContent, RemedyEssence } from "@/components/remedy-content";
import type { Locale, Remedy, RemedyDirectoryEntry } from "@/data/remedies";

type Book02ReferenceProps = {
  locale: Locale;
  remedies: Remedy[];
  entries: RemedyDirectoryEntry[];
};

const copy = {
  ru: {
    book: "Книга 02",
    title: "Гомеопатические препараты",
    description: "Справочник из 94 авторских карточек. Ищите по латинскому, русскому или сокращённому названию и переходите к нужному препарату.",
    count: "94 препарата",
    directory: "Открыть отдельный каталог",
    back: "← К библиотеке",
    search: "Найти препарат...",
    all: "Все",
    result: "препаратов",
    empty: "Ничего не найдено",
    remedies: "Препараты (94)",
    close: "Закрыть препараты",
    standalone: "Открыть отдельную карточку",
    source: "Источник",
    sourceRecord: "Записи источника",
    sourceName: "Исходное название",
    gallery: "Дополнительные изображения из источника",
    galleryHint: "Из связанных авторских сообщений",
    disclaimer: "Материал публикуется как образовательный архив авторских текстов. Он не заменяет диагностику, лечение или консультацию квалифицированного специалиста.",
    language: "EN",
  },
  en: {
    book: "Book 02",
    title: "Homeopathic remedies",
    description: "A reference of 94 authorial cards. Search by Latin name, Russian/source name, alias, or abbreviation, then jump to a remedy.",
    count: "94 remedies",
    directory: "Open remedy directory",
    back: "← Library",
    search: "Find a remedy...",
    all: "All",
    result: "remedies",
    empty: "No remedies found",
    remedies: "Remedies (94)",
    close: "Close remedies",
    standalone: "Open standalone card",
    source: "Source",
    sourceRecord: "Source records",
    sourceName: "Source name",
    gallery: "Additional source images",
    galleryHint: "From linked author messages",
    disclaimer: "This is an educational archive of the author’s texts. It does not replace diagnosis, treatment, or advice from a qualified professional.",
    language: "RU",
  },
} as const;

function normalise(value: string) {
  const cyrillic: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sh", ы: "y", э: "e", ю: "yu", я: "ya", ь: "", ъ: "" };
  return [...value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()]
    .map((character) => cyrillic[character] ?? character)
    .join("")
    .replace(/c/g, "k")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

function sourceRecords(remedy: Remedy) {
  return [...new Set(remedy.source_messages?.match(/message-?\d+/gi) ?? [])].join(", ");
}

function RemedyNavigator({ entries, locale, onNavigate }: { entries: RemedyDirectoryEntry[]; locale: Locale; onNavigate?: (slug: string) => void }) {
  const labels = copy[locale];
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState("all");
  const deferredQuery = useDeferredValue(query);
  const letters = [...new Set(entries.map(({ letter }) => letter))];
  const visibleEntries = useMemo(() => {
    const normalisedQuery = normalise(deferredQuery);
    return entries.filter((entry) => (activeLetter === "all" || entry.letter === activeLetter) && (!normalisedQuery || entry.searchText.includes(normalisedQuery)));
  }, [activeLetter, deferredQuery, entries]);

  return (
    <div className="book-reference-navigator">
      <label className="book-reference-search">
        <Search aria-hidden="true" className="size-4" />
        <span className="sr-only">{labels.search}</span>
        <input onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} type="search" value={query} />
      </label>
      <div aria-label={locale === "ru" ? "Алфавитный указатель" : "Alphabetical index"} className="book-reference-alphabet">
        <button aria-pressed={activeLetter === "all"} onClick={() => setActiveLetter("all")} type="button">{labels.all}</button>
        {letters.map((letter) => <button aria-pressed={activeLetter === letter} key={letter} onClick={() => setActiveLetter(letter)} type="button">{letter}</button>)}
      </div>
      <p className="book-reference-result-count" role="status">{visibleEntries.length} {labels.result}</p>
      {visibleEntries.length ? <ul className="book-reference-remedy-list">{visibleEntries.map((entry) => <li key={entry.slug}>
        <a href={`#remedy-${entry.slug}`} onClick={(event) => {
          if (!onNavigate) return;
          event.preventDefault();
          onNavigate(entry.slug);
        }}>{entry.title}</a>
        <Link aria-label={`${labels.standalone}: ${entry.title}`} href={`/${locale}/homeopathy/remedies/${entry.slug}`}>↗</Link>
      </li>)}</ul> : <p className="book-reference-empty" role="status">{labels.empty}</p>}
    </div>
  );
}

function BookRemedyImages({ locale, remedy }: { locale: Locale; remedy: Remedy }) {
  const labels = copy[locale];
  const alt = remedy.primary_image_alt || (locale === "ru" ? `Исходное изображение, прикреплённое к ${remedy.canonical_latin_name}.` : `Source image attached to ${remedy.canonical_latin_name}.`);
  const supporting = (remedy.supporting_images || "").split(";").map((image) => image.trim()).filter(Boolean);

  return <>
    <RemedyEssence locale={locale} remedy={remedy} />
    {remedy.primary_image ? <figure className="book-remedy-primary-image">
      {/* The source attachment is rendered without inferred visual claims. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={alt} decoding="async" src={remedy.primary_image} />
    </figure> : null}
    <RemedyContent locale={locale} remedy={remedy} showEssence={false} sourceUrl={remedy.primary_source_url} variant="book" />
    <footer className="book-remedy-source">
      <p>{labels.source}</p>
      <strong>{remedy.source_author}</strong>
      {remedy.primary_source_url ? <a href={remedy.primary_source_url} rel="noreferrer" target="_blank">Telegram</a> : null}
      {sourceRecords(remedy) ? <span>{labels.sourceRecord}: {sourceRecords(remedy)}</span> : null}
      {locale === "en" ? <span>Translation: {remedy.translation_provenance}.</span> : null}
      <Link href={`/${locale}/homeopathy/remedies/${remedy.slug}`}>{labels.standalone} →</Link>
    </footer>
    {supporting.length ? <section aria-label={labels.gallery} className="book-remedy-gallery"><p>{labels.galleryHint}</p><div>{supporting.map((image, index) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={`${alt} ${index + (remedy.primary_image ? 2 : 1)}.`} decoding="async" key={image} loading="lazy" src={image} />
    ))}</div></section> : null}
  </>;
}

export function Book02Reference({ locale, remedies, entries }: Book02ReferenceProps) {
  const labels = copy[locale];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const otherLanguageHref = locale === "ru" ? "/books/alchemy-homeopathy-remedies?lang=en" : "/books/alchemy-homeopathy-remedies";

  function jumpFromDrawer(slug: string) {
    setDrawerOpen(false);
    window.requestAnimationFrame(() => {
      const target = document.getElementById(`remedy-${slug}`);
      window.history.pushState(null, "", `#remedy-${slug}`);
      target?.scrollIntoView({ block: "start" });
    });
  }

  return <main className="book-reference-shell">
    <header className="book-reference-header">
      <div><Link className="reader-back-link" href="/">{labels.back}</Link><p className="reader-eyebrow">{labels.book}</p><h1>{labels.title}</h1><p>{labels.description}</p></div>
      <div className="book-reference-header-actions"><span>{labels.count}</span><Link href={`/${locale}/homeopathy/remedies`}>{labels.directory}</Link><Link href={otherLanguageHref} lang={locale === "ru" ? "en" : "ru"}>{labels.language}</Link></div>
    </header>
    <button aria-controls="book-remedy-drawer" aria-expanded={drawerOpen} className="book-reference-mobile-toggle" onClick={() => setDrawerOpen(true)} type="button">{labels.remedies}</button>
    {drawerOpen ? <div className="book-reference-drawer-backdrop" onClick={() => setDrawerOpen(false)}><aside aria-label={labels.remedies} aria-modal="true" className="book-reference-drawer" id="book-remedy-drawer" onClick={(event) => event.stopPropagation()} role="dialog"><div><p className="book-reference-drawer-title">{labels.remedies}</p><button aria-label={labels.close} onClick={() => setDrawerOpen(false)} type="button"><X aria-hidden="true" className="size-5" /></button></div><RemedyNavigator entries={entries} locale={locale} onNavigate={jumpFromDrawer} /></aside></div> : null}
    <div className="book-reference-layout">
      <aside className="book-reference-sidebar"><div><p>{labels.book}</p><strong>{labels.title}</strong></div><RemedyNavigator entries={entries} locale={locale} /></aside>
      <article className="book-reference-article">
        {remedies.map((remedy) => <section className="book-remedy-section" id={`remedy-${remedy.slug}`} key={remedy.slug}>
          <p className="book-remedy-letter" aria-hidden="true">{remedy.canonical_latin_name.charAt(0).toUpperCase()}</p>
          <h2>{remedy.canonical_latin_name}</h2>
          {remedy.russian_common_name ? <p className="book-remedy-common-name">{labels.sourceName}: {remedy.russian_common_name}</p> : null}
          <BookRemedyImages locale={locale} remedy={remedy} />
          <p className="book-remedy-disclaimer">{labels.disclaimer}</p>
        </section>)}
      </article>
    </div>
  </main>;
}
