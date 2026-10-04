import { LibraryBackLink } from "@/components/library-hub";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import { SpanishBookShowcase } from "@/components/spanish-book-showcase";
import { books } from "@/data/library";
import { bookSectionTitles, parseBookSection } from "@/data/library-sections";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata(
  "/es/books",
  "Libros — Holistic House",
  "Biblioteca del autor: Alquimia del Alma, tradición taoísta y tradición maya. Títulos y descripciones en español.",
);

type Props = {
  searchParams: Promise<{ section?: string | string[] }>;
};

export default async function SpanishBooksPage({ searchParams }: Props) {
  const query = await searchParams;
  const section = parseBookSection(query.section);
  const heading = section ? bookSectionTitles.es[section] : "Mis libros";

  return (
    <main className="homeopathy-shell remedies-landing" lang="es">
      <PublicSiteHeader locale="es" />
      <LibraryBackLink locale="es" />
      <section className="remedies-hero">
        <p className="homeopathy-kicker">Biblioteca del autor</p>
        <h1>{heading}</h1>
        <p>Libros y guías del proyecto, con sus imágenes originales y estructura de secciones.</p>
        <p>Los títulos y las descripciones del catálogo están en español. Las ediciones completas conservan su idioma original y se abren en otra pestaña.</p>
      </section>
      <SpanishBookShowcase books={books} section={section} />
      <p className="remedy-disclaimer">Los materiales se ofrecen como archivo educativo de los textos del autor y no sustituyen el diagnóstico ni el tratamiento médico.</p>
      <PublicConsultationCta locale="es" />
    </main>
  );
}
