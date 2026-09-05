"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import type { Locale, RemedyDirectoryEntry } from "@/data/remedies";

type RemedyDirectoryProps = {
  locale: Locale;
  entries: RemedyDirectoryEntry[];
};

const labels = {
  ru: { search: "Найти препарат или алиас", result: "препаратов", empty: "Ничего не найдено", emptyHint: "Проверьте латинское, русское или сокращённое название.", all: "Все" },
  en: { search: "Find a remedy or alias", result: "remedies", empty: "No remedies found", emptyHint: "Try a Latin, Russian/common, or abbreviated name.", all: "All" },
} as const;

function normalise(value: string) {
  const cyrillic = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sh", ы: "y", э: "e", ю: "yu", я: "ya", ь: "", ъ: "" } as Record<string, string>;
  return [...value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()]
    .map((character) => cyrillic[character] ?? character)
    .join("")
    .replace(/c/g, "k")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

export function RemedyDirectory({ locale, entries }: RemedyDirectoryProps) {
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState("all");
  const deferredQuery = useDeferredValue(query);
  const copy = labels[locale];
  const letters = [...new Set(entries.map(({ letter }) => letter))];
  const visibleEntries = useMemo(() => {
    const normalisedQuery = normalise(deferredQuery);
    return entries.filter((entry) => {
      const matchesLetter = activeLetter === "all" || entry.letter === activeLetter;
      const matchesQuery = !normalisedQuery || entry.searchText.includes(normalisedQuery);
      return matchesLetter && matchesQuery;
    });
  }, [activeLetter, deferredQuery, entries]);

  return (
    <section aria-label={locale === "ru" ? "Каталог препаратов" : "Remedy directory"} className="remedy-directory">
      <label className="remedy-search">
        <Search aria-hidden="true" className="size-4" />
        <span className="sr-only">{copy.search}</span>
        <input onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} type="search" value={query} />
      </label>
      <div aria-label={locale === "ru" ? "Алфавитный указатель" : "Alphabetical index"} className="remedy-alphabet">
        <button aria-pressed={activeLetter === "all"} onClick={() => setActiveLetter("all")} type="button">{copy.all}</button>
        {letters.map((letter) => <button aria-pressed={activeLetter === letter} key={letter} onClick={() => setActiveLetter(letter)} type="button">{letter}</button>)}
      </div>
      <p className="remedy-result-count" role="status">{visibleEntries.length} {copy.result}</p>
      {visibleEntries.length ? (
        <ul className="remedy-list">
          {visibleEntries.map((entry) => (
            <li key={entry.slug}>
              <Link href={`/${locale}/homeopathy/remedies/${entry.slug}`}>
                <span className="remedy-list-letter">{entry.letter}</span>
                <span><strong>{entry.title}</strong>{entry.commonName ? <small>{entry.commonName}</small> : null}{entry.aliases.length ? <em>{entry.aliases.join(" · ")}</em> : null}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="remedy-empty" role="status"><h2>{copy.empty}</h2><p>{copy.emptyHint}</p></div>
      )}
    </section>
  );
}
