import { LibraryBackLink } from '@/components/library-hub';
import Link from 'next/link';
import { PublicSiteHeader } from '@/components/public-site-header';
import { SpanishRemedyDirectory } from '@/components/spanish-remedy-directory';
import { SpanishBookShowcase } from '@/components/spanish-book-showcase';
import { PublicConsultationCta } from '@/components/public-consultation-cta';
import { getSpanishRemedyDirectory } from '@/data/remedies-es';
import { books } from '@/data/library';
import { spanishMetadata } from '@/lib/spanish-metadata';
export const metadata = spanishMetadata('/es/homeopathy', 'Remedios — Holistic House', 'Busca en la biblioteca de remedios del autor, explora sus libros y escribe directamente a Andy si quieres hablar de una consulta.');
export default function SpanishHomeopathyPage() {
  return <main className="homeopathy-shell remedies-landing" lang="es"><PublicSiteHeader locale="es" /><LibraryBackLink locale="es" /><section className="remedies-hero"><p className="homeopathy-kicker">Biblioteca de consulta</p><h1>Remedios</h1><p>Encuentra un remedio por su nombre latino, alias, abreviatura o palabra clave.</p></section><SpanishRemedyDirectory entries={getSpanishRemedyDirectory()} />
    <PublicConsultationCta locale="es" />
    <section className="remedies-books-section" aria-labelledby="remedies-books-title"><div className="remedies-section-heading"><div><p className="homeopathy-kicker">Biblioteca</p><h2 id="remedies-books-title">Mis libros</h2><p>Libros y guías del proyecto con sus imágenes originales y estructura de secciones.</p></div><Link href="/es/books">Explorar toda la biblioteca →</Link></div><SpanishBookShowcase books={books} /></section><p className="remedy-disclaimer remedies-landing-disclaimer">Los materiales se presentan como archivo educativo de los textos del autor. Las traducciones automáticas de las fichas pueden contener errores; no sustituyen el diagnóstico ni el tratamiento médico.</p></main>;
}
