'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SpanishRemedyEntry } from '@/data/remedies-es';
import styles from './spanish-remedy-directory.module.css';

const descriptionTypeLabel = {
  'full-card': 'Descripción completa',
  'source-excerpt': 'Descripción breve',
  'source-description': 'Descripción de fuente',
} as const;

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function SpanishRemedyDirectory({ entries }: { entries: SpanishRemedyEntry[] }) {
  const [query, setQuery] = useState('');
  const [letter, setLetter] = useState('');
  const letters = useMemo(() => [...new Set(entries.map(entry => entry.letter))].sort(), [entries]);
  const normalizedQuery = normalize(query);
  const matches = useMemo(() => {
    const needles = normalizedQuery.split(' ').filter(Boolean);
    if (!needles.length) return [];
    return entries.filter(entry => needles.every(needle => normalize([entry.title, ...entry.aliases, entry.searchText, entry.summary].join(' ')).includes(needle)));
  }, [entries, normalizedQuery]);
  const suggestions = matches.slice(0, 8);
  const visible = useMemo(() => {
    const needles = normalizedQuery.split(' ').filter(Boolean);
    return entries.filter(entry => (!letter || entry.letter === letter) && needles.every(needle => normalize([entry.title, ...entry.aliases, entry.searchText, entry.summary].join(' ')).includes(needle)));
  }, [entries, normalizedQuery, letter]);

  return <section className={styles.directory} aria-label="Catálogo de remedios">
    <div className="remedies-search-block remedy-directory-search">
      <label className="remedies-search-label" htmlFor="spanish-remedy-search">
        <span>Buscar un remedio homeopático</span>
        <div className="remedies-search-input">
          <Search aria-hidden="true" className="size-4" />
          <input
            id="spanish-remedy-search"
            type="search"
            autoComplete="off"
            placeholder="Nombre latino, alias o palabra clave…"
            value={query}
            aria-controls="spanish-remedy-suggestions"
            aria-expanded={Boolean(query.trim())}
            onChange={event => {
              setQuery(event.target.value);
              if (event.target.value.trim()) setLetter('');
            }}
          />
        </div>
      </label>
      {query.trim() ? <div className="remedies-search-results" id="spanish-remedy-suggestions" role="list">
        {suggestions.length ? suggestions.map(entry => <Link href={`/es/homeopathy/remedies/${entry.slug}`} key={entry.slug} role="listitem">
          <span className="remedies-search-result-topline">
            <strong>{entry.title}</strong>
            <span className={`remedy-description-type remedy-description-type--${entry.descriptionType}`}>
              {descriptionTypeLabel[entry.descriptionType]}
            </span>
          </span>
          {entry.aliases.length ? <span>{entry.aliases.join(' · ')}</span> : null}
        </Link>) : <p>No se encontraron remedios.</p>}
      </div> : null}
    </div>

    <div className={styles.alphabet} aria-label="Filtrar por letra">
      <button type="button" aria-pressed={!letter} onClick={() => setLetter('')}>Todos</button>
      {letters.map(item => <button type="button" key={item} aria-pressed={letter === item} onClick={() => setLetter(item)}>{item}</button>)}
    </div>
    <p className={styles.count} role="status" aria-live="polite">{visible.length === 1 ? '1 remedio' : `${visible.length} remedios`}</p>
    {visible.length ? <div className={styles.grid}>{visible.map(entry => <Link className={styles.card} href={`/es/homeopathy/remedies/${entry.slug}`} key={entry.slug}>
      <div className={styles.cardHeading}><h2>{entry.title}</h2><span className={`remedy-description-type remedy-description-type--${entry.descriptionType}`}>{descriptionTypeLabel[entry.descriptionType]}</span></div>
      <p>{entry.summary}{entry.summary.length >= 180 ? '…' : ''}</p>
      <span>Leer el texto completo <span aria-hidden="true">→</span></span>
    </Link>)}</div> : <div className={styles.empty}><p>No se encontraron remedios con esta búsqueda.</p><button type="button" onClick={() => { setQuery(''); setLetter(''); }}>Restablecer filtros</button></div>}
  </section>;
}
