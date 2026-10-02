'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SpanishRemedyEntry } from '@/data/remedies-es';
import styles from './spanish-remedy-directory.module.css';
function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
export function SpanishRemedyDirectory({ entries }: { entries: SpanishRemedyEntry[] }) {
  const [query, setQuery] = useState('');
  const [letter, setLetter] = useState('');
  const letters = useMemo(() => [...new Set(entries.map(entry => entry.letter))].sort(), [entries]);
  const visible = useMemo(() => {
    const needles = normalize(query).split(' ').filter(Boolean);
    return entries.filter(entry => (!letter || entry.letter === letter) && needles.every(needle => normalize([entry.title, ...entry.aliases, entry.searchText, entry.summary].join(' ')).includes(needle)));
  }, [entries, query, letter]);
  return <section className={styles.directory} aria-label="Catálogo de remedios">
    <label className={styles.search}><span>Buscar un remedio</span><input type="search" autoComplete="off" placeholder="Nombre latino, alias o palabra clave" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <div className={styles.alphabet} aria-label="Filtrar por letra"><button type="button" aria-pressed={!letter} onClick={() => setLetter('')}>Todos</button>{letters.map(item => <button type="button" key={item} aria-pressed={letter === item} onClick={() => setLetter(item)}>{item}</button>)}</div>
    <p className={styles.count} role="status" aria-live="polite">{visible.length === 1 ? '1 remedio' : `${visible.length} remedios`}</p>
    {visible.length ? <div className={styles.grid}>{visible.map(entry => <Link className={styles.card} href={`/es/homeopathy/remedies/${entry.slug}`} key={entry.slug}><h2>{entry.title}</h2><p>{entry.summary}{entry.summary.length >= 180 ? '…' : ''}</p><span>Leer el texto completo <span aria-hidden="true">→</span></span></Link>)}</div> : <div className={styles.empty}><p>No se encontraron remedios con esta búsqueda.</p><button type="button" onClick={() => { setQuery(''); setLetter(''); }}>Restablecer filtros</button></div>}
  </section>;
}
