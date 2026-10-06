"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { readPublicReadingState } from "@/lib/public-reading-state";

import type { Locale, RemedyDirectoryEntry, RemedyDescriptionType } from "@/data/remedies";

type RemedyDirectoryProps = {
  locale: Locale;
  entries: RemedyDirectoryEntry[];
};

const labels = {
  ru: {
    searchLabel: "Поиск препарата",
    searchPlaceholder: "Введите название, алиас или сокращение…",
    searchHint: "Начните вводить — ниже появятся подходящие препараты.",
    result: "препаратов",
    empty: "Ничего не найдено",
    emptyHint: "Проверьте латинское, русское или сокращённое название.",
    all: "Все",
    descriptionTypes: {
      "full-card": "Полное описание",
      "source-excerpt": "Краткое описание",
      "source-description": "Описание из источника",
    },
  },
  en: {
    searchLabel: "Remedy search",
    searchPlaceholder: "Type a name, alias, or abbreviation…",
    searchHint: "Start typing to see matching remedies below.",
    result: "remedies",
    empty: "No remedies found",
    emptyHint: "Try a Latin, Russian/common, or abbreviated name.",
    all: "All",
    descriptionTypes: {
      "full-card": "Full description",
      "source-excerpt": "Short description",
      "source-description": "Source description",
    },
  },
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
  const searchParams = useSearchParams();
  const savedOnly = searchParams.get("saved") === "1";
  const savedSlugs = useMemo(
    () => typeof window === "undefined" ? [] : readPublicReadingState(new Set(entries.map((entry) => entry.slug))).savedSlugs,
    [entries],
  );
  const copy = labels[locale];
  const letters = [...new Set(entries.map(({ letter }) => letter))];

  const normalisedQuery = normalise(deferredQuery);
  const matchingEntries = useMemo(
    () => !normalisedQuery ? [] : entries.filter((entry) => entry.searchText.includes(normalisedQuery)),
    [entries, normalisedQuery],
  );
  const suggestions = matchingEntries.slice(0, 8);

  const visibleEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesLetter = activeLetter === "all" || entry.letter === activeLetter;
      const matchesQuery = !normalisedQuery || entry.searchText.includes(normalisedQuery);
      return matchesLetter && matchesQuery && (!savedOnly || savedSlugs.includes(entry.slug));
    });
  }, [activeLetter, entries, normalisedQuery, savedOnly, savedSlugs]);

  const typeLabel = (descriptionType: RemedyDescriptionType) => copy.descriptionTypes[descriptionType];

  return (
    <section aria-label={locale === "ru" ? "Каталог препаратов" : "Remedy directory"} className="remedy-directory">
      <div className="remedies-search-block remedy-directory-search">
        <label className="remedies-search-label" htmlFor="remedy-directory-search">
          <span>{copy.searchLabel}</span>
          <div className="remedies-search-input">
            <Search aria-hidden="true" className="size-4" />
            <input
              aria-controls="remedy-directory-suggestions"
              aria-expanded={Boolean(query.trim())}
              autoComplete="off"
              id="remedy-directory-search"
              onChange={(event) => {
                setQuery(event.target.value);
                if (event.target.value.trim()) setActiveLetter("all");
              }}
              placeholder={copy.searchPlaceholder}
              type="search"
              value={query}
            />
          </div>
        </label>

        {query.trim() ? (
          <div className="remedies-search-results" id="remedy-directory-suggestions" role="list">
            {suggestions.length ? suggestions.map((entry) => (
              <Link href={`/${locale}/homeopathy/remedies/${entry.slug}`} key={entry.slug} role="listitem">
                <span className="remedies-search-result-topline">
                  <strong>{entry.title}</strong>
                  <span className={`remedy-description-type remedy-description-type--${entry.descriptionType}`}>
                    {typeLabel(entry.descriptionType)}
                  </span>
                </span>
                {entry.commonName ? <span>{entry.commonName}</span> : null}
                {entry.aliases.length ? <small>{entry.aliases.join(" · ")}</small> : null}
              </Link>
            )) : <p>{copy.empty}</p>}
          </div>
        ) : null}
      </div>

      <div aria-label={locale === "ru" ? "Алфавитный указатель" : "Alphabetical index"} className="remedy-alphabet">
        <button aria-pressed={activeLetter === "all"} onClick={() => setActiveLetter("all")} type="button">{copy.all}</button>
        {letters.map((letter) => (
          <button aria-pressed={activeLetter === letter} key={letter} onClick={() => setActiveLetter(letter)} type="button">
            {letter}
          </button>
        ))}
      </div>

      <p className="remedy-result-count" role="status">{visibleEntries.length} {copy.result}</p>
      {visibleEntries.length ? (
        <ul className="remedy-list">
          {visibleEntries.map((entry) => (
            <li key={entry.slug}>
              <Link href={`/${locale}/homeopathy/remedies/${entry.slug}`}>
                <span className="remedy-list-letter">{entry.letter}</span>
                <span className="remedy-list-copy">
                  <span className="remedy-list-heading">
                    <strong>{entry.title}</strong>
                    <span className={`remedy-description-type remedy-description-type--${entry.descriptionType}`}>
                      {typeLabel(entry.descriptionType)}
                    </span>
                  </span>
                  {entry.commonName ? <small>{entry.commonName}</small> : null}
                  {entry.aliases.length ? <em>{entry.aliases.join(" · ")}</em> : null}
                </span>
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
