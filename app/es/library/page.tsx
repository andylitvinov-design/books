import { LibraryHub, libraryCopy, type LibraryView } from '@/components/library-hub';
import { spanishMetadata } from '@/lib/spanish-metadata';
export const metadata = { ...spanishMetadata('/es/library', 'Biblioteca — Holistic House', libraryCopy.es.lead), alternates: { canonical: '/es/library', languages: { en: '/en/library', ru: '/ru/library', es: '/es/library' } } };
type Props = { searchParams: Promise<{ view?: string | string[] }> };
export default async function SpanishLibraryPage({ searchParams }: Props) {
  const query = await searchParams;
  const raw = Array.isArray(query.view) ? query.view[0] : query.view;
  const view: LibraryView = raw === "dao" || raw === "books" || raw === "videos" ? raw : "latest";
  return <LibraryHub locale="es" view={view} />;
}
