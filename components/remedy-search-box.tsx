"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import type { Locale, RemedyDirectoryEntry } from "@/data/remedies";

type RemedySearchBoxProps = {
  locale: Locale;
  entries: RemedyDirectoryEntry[];
};

const copy = {
  ru: {
    label: "Найти гомеопатический препарат",
    placeholder: "Название, алиас или сокращение…",
    empty: "Ничего не найдено",
    all: "Все препараты",
  },
  en: {
    label: "Find a homeopathic remedy",
    placeholder: "Name, alias, or abbreviation…",
    empty: "No remedies found",
    all: "All remedies",
  },
} as const;

function normalise(value: string) {
  const cyrillic = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sh", ы: "y", э: "e", ю: "yu", я: "ya", ь: "", ъ: "" } as Record<string, string>;
  return [...value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()]
    .map((character) => cyrillic[character] ?? character)
    .join("")
    .replace(/c/g, "k")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

export function RemedySearchBox({ locale, entries }: RemedySearchBoxProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const text = copy[locale];
  const matches = useMemo(() => {
    const needle = normalise(deferredQuery);
    if (!needle) return [];
    return entries.filter((entry) => entry.searchText.includes(needle)).slice(0, 8);
  }, [deferredQuery, entries]);

  return (
    <section className="remedies-search-block" aria-label={text.label}>
      <label className="remedies-search-label">
        <span>{text.label}</span>
        <div className="remedies-search-input">
          <Search aria-hidden="true" className="size-4" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={text.placeholder}
            autoComplete="off"
          />
        </div>
      </label>

      {query.trim() ? (
        <div className="remedies-search-results" role="list">
          {matches.length ? matches.map((entry) => (
            <Link href={`/${locale}/homeopathy/remedies/${entry.slug}`} key={entry.slug} role="listitem">
              <strong>{entry.title}</strong>
              {entry.commonName ? <span>{entry.commonName}</span> : null}
            </Link>
          )) : <p>{text.empty}</p>}
        </div>
      ) : null}

      <Link className="remedies-all-link" href={`/${locale}/homeopathy/remedies`}>{text.all} →</Link>
    </section>
  );
}
