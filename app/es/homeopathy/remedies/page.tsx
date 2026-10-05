import { PublicConsultationCta } from '@/components/public-consultation-cta';
import { PublicSiteHeader } from '@/components/public-site-header';
import { SpanishRemedyDirectory } from '@/components/spanish-remedy-directory';
import { getSpanishRemedyDirectory } from '@/data/remedies-es';
import { spanishMetadata } from '@/lib/spanish-metadata';
export const metadata = spanishMetadata('/es/homeopathy/remedies', 'Catálogo de remedios — Holistic House', 'Directorio completo de remedios del autor: búsqueda por nombre, alias y palabra clave, con textos en español.');
export default function SpanishRemediesPage() { return <main className="homeopathy-shell remedies-landing" lang="es"><PublicSiteHeader locale="es" /><section className="remedies-hero"><p className="homeopathy-kicker">Biblioteca de consulta</p><h1>Catálogo de remedios</h1><p>Explora el directorio alfabético y abre el texto completo de cada remedio.</p></section><SpanishRemedyDirectory entries={getSpanishRemedyDirectory()} /><p className="remedy-disclaimer">Archivo educativo del autor. Las fichas están traducidas automáticamente del original y pueden contener errores. No sustituyen el diagnóstico ni el tratamiento médico.</p><PublicConsultationCta locale="es" /></main>; }
