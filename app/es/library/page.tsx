import { LibraryHub, libraryCopy } from '@/components/library-hub';
import { spanishMetadata } from '@/lib/spanish-metadata';
export const metadata = { ...spanishMetadata('/es/library', 'Biblioteca — Holistic House', libraryCopy.es.lead), alternates: { canonical: '/es/library', languages: { en: '/en/library', ru: '/ru/library', es: '/es/library' } } };
export default function SpanishLibraryPage() { return <LibraryHub locale="es" />; }
