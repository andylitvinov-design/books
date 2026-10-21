import { LibraryBackLink } from "@/components/library-hub";
import { IdeasDiscovery } from "@/components/ideas-discovery";
import { IdeasNewsFeed } from "@/components/ideas-news-feed";
import { DaoHexagramLibraryLink } from "@/components/dao-hexagram-library-link";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import { SpanishBookShowcase } from "@/components/spanish-book-showcase";
import { books } from "@/data/library";
import { spanishMetadata } from "@/lib/spanish-metadata";

// A removed or unpublished item must not linger in a public cached feed.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = spanishMetadata(
  "/es/books",
  "Ideas — orientación y libros | Holistic House",
  "Escribe tu pregunta y recibe un símbolo del I Ching, tres aforismos por tema o un primer paso gratuito. Explora los libros de Holistic House.",
);

export default function SpanishBooksPage() {
  return (
    <main className="homeopathy-shell remedies-landing" lang="es">
      <PublicSiteHeader locale="es" />
      <IdeasDiscovery locale="es" />
      <LibraryBackLink locale="es" />
      <section className="remedies-hero">
        <p className="homeopathy-kicker">Biblioteca del autor</p>
        <h2 className="mt-3 font-serif text-4xl leading-tight text-[#2c2119] sm:text-5xl">Libros y guías</h2>
        <p>Libros y guías del proyecto, con sus imágenes originales y estructura de secciones.</p>
        <p>Los títulos y las descripciones del catálogo están en español. Las ediciones completas conservan su idioma original y se abren en otra pestaña.</p>
      </section>
      <DaoHexagramLibraryLink locale="es" />
      <SpanishBookShowcase books={books} />
      <p className="remedy-disclaimer">Los materiales se ofrecen como archivo educativo de los textos del autor y no sustituyen el diagnóstico ni el tratamiento médico.</p>
      <PublicConsultationCta locale="es" />
      <IdeasNewsFeed locale="es" />
    </main>
  );
}
