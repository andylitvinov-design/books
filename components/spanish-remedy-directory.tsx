'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';

import type { SpanishRemedyEntry } from '@/data/remedies-es';
import styles from './spanish-remedy-directory.module.css';

const descriptionTypes = {
  'full-card': 'Descripción completa',
  'source-excerpt': 'Descripción breve',
  'source-description': 'Descripción de la fuente',
} as const;

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function matches(entry: SpanishRemedyEntry, query: string) {
  const needles = normalize(query).split(' ').filter(Boolean);
  const haystack = normalize([entry.title, ...entry.aliases, entry.searchText, entry.summary].join(' '));
  return !needles.length || needles.every((needle) => haystack.includes(needle));
}

export function SpanishRemedyDirectory({ entries }: { entries: SpanishRemedyEntry[] }) {
  const [query, setQuery] = useState('');
  const [letter, setLetter] = useState('');
  const deferredQuery = useDeferredValue(query);
  const letters = useMemo(() => [...new Set(entries.map((entry) => entry.letter))].sort(), [entries]);
  const suggestions = useMemo(
    () => deferredQuery.trim() ? entries.filter((entry) => matches(entry, deferredQuery)).slice(0, 8) : [],
    [deferredQuery, entries],
  );
  const visible = useMemo(
    () => entries.filter((entry) => (!letter || entry.letter === letter) && matches(entry, deferredQuery)),
    [entries, deferredQuery, letter],
  );
  const resetSearch = () => {
    setQuery('');
    setLetter('');
  };

  return <section className={styles.directory} aria-label="Catálogo de remedios">
    <div className="remedies-search-block">
      <label className="remedies-search-label" htmlFor="spanish-remedy-search">
        <span>Buscar un remedio homeopático</span>
        <div className="remedies-search-input">
          <Search aria-hidden="true" className="size-4" />
          <input
            aria-controls="spanish-remedy-suggestions"
            aria-expanded={Boolean(query.trim())}
            id="spanish-remedy-search"
            type="search"
            autoComplete="off"
            placeholder="Nombre, alias o abreviatura…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (event.target.value.trim()) setLetter('');
            }}
          />
        </div>
      </label>

      <button className="remedies-all-link" type="button" onClick={resetSearch}>Todos los remedios →</button>

      {query.trim() ? <div className="remedies-search-results" id="spanish-remedy-suggestions" role="list">
        {suggestions.length ? suggestions.map((entry) => <Link href={`/es/homeopathy/remedies/${entry.slug}`} key={entry.slug} role="listitem">
          <span className="remedies-search-result-topline">
            <strong>{entry.title}</strong>
            <span className={`remedy-description-type remedy-description-type--${entry.descriptionType}`}>
              {descriptionTypes[entry.descriptionType]}
            </span>
          </span>
          <span>{entry.summary}{entry.summary.length >= 110 ? '…' : ''}</span>
        </Link>) : <p>No se encontraron remedios con esta búsqueda.</p>}
      </div> : null}
    </div>

    <div className={styles.alphabet} aria-label="Filtrar por letra">
      <button type="button" aria-pressed={!letter} onClick={() => setLetter('')}>Todos</button>
      {letters.map((item) => <button type="button" key={item} aria-pressed={letter === item} onClick={() => setLetter(item)}>{item}</button>)}
    </div>

    <p className={styles.count} role="status" aria-live="polite">{visible.length === 1 ? '1 remedio' : `${visible.length} remedios`}</p>
    {visible.length ? <div className={styles.grid}>{visible.map((entry) => <Link className={styles.card} href={`/es/homeopathy/remedies/${entry.slug}`} key={entry.slug}>
      <span className={styles.cardTopline}>
        <h2>{entry.title}</h2>
        <span className={`remedy-description-type remedy-description-type--${entry.descriptionType}`}>{descriptionTypes[entry.descriptionType]}</span>
      </span>
      <p>{entry.summary}{entry.summary.length >= 180 ? '…' : ''}</p>
      <span>Leer el texto completo <span aria-hidden="true">→</span></span>
    </Link>)}</div> : <div className={styles.empty}><p>No se encontraron remedios con esta búsqueda.</p><button type="button" onClick={resetSearch}>Restablecer filtros</button></div>}
  </section>;
}
