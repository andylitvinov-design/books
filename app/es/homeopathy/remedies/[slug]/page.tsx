import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicSiteHeader } from '@/components/public-site-header';
import { RemedyClientActions } from '@/components/remedy-client-actions';
import { SpanishRemedyContent } from '@/components/spanish-remedy-content';
import { getSpanishRemedy, getSpanishRemedySlugs } from '@/data/remedies-es';
import { spanishMetadata } from '@/lib/spanish-metadata';
type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return getSpanishRemedySlugs().map(slug => ({ slug })); }
export async function generateMetadata({ params }: Props) {
  const { slug } = await params; const remedy = getSpanishRemedy(slug);
  return remedy ? spanishMetadata(`/es/homeopathy/remedies/${slug}`, `${remedy.canonical_latin_name} — Remedios`, remedy.description.replace(/[#*]/g, '').slice(0, 155)) : { title: 'Remedio no encontrado' };
}
export default async function SpanishRemedyPage({ params }: Props) {
  const { slug } = await params; const remedy = getSpanishRemedy(slug); if (!remedy) notFound();
  const related = (remedy.related_slugs || '').split(';').map(value => getSpanishRemedy(value.trim())).filter(item => !!item);
  const supporting = (remedy.supporting_images || '').split(';').map(value => value.trim()).filter(Boolean);
  const state = remedy.main_state?.trim(); const outcome = remedy.observed_effect?.trim() || remedy.transformation?.trim();
  const alt = remedy.primary_image_alt || `Imagen original asociada a ${remedy.canonical_latin_name}`;
  return <main className="homeopathy-shell" lang="es"><PublicSiteHeader locale="es" /><article className="remedy-page">
    <div className="remedy-page-actions"><Link href="/es/homeopathy">← Volver a los remedios</Link><Link href="/es/homeopathy/remedies">Catálogo completo</Link></div>
    <RemedyClientActions locale="en" displayLocale="es" slug={slug} knownSlugs={getSpanishRemedySlugs()} />
    <p className="homeopathy-kicker">Remedios · archivo del autor</p><h1>{remedy.canonical_latin_name}</h1>
    <p className="remedy-disclaimer">Traducción automática del texto original del autor; puede contener errores. Este archivo educativo no constituye una recomendación médica ni sustituye la atención profesional.</p>
    {state && outcome && <p className="remedy-essence"><span>Esencia</span>{state} → {outcome}</p>}
    {remedy.primary_image && <figure className="remedy-primary-image">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={remedy.primary_image} alt={alt} decoding="async" />
    </figure>}
    <SpanishRemedyContent description={remedy.description} />
    <details className="remedy-source-reference"><summary>Fuentes y traducción</summary><div><strong>{remedy.source_author}</strong><p>La traducción conserva el contenido del archivo publicado y sus referencias. Consulta las versiones originales para comprobar cualquier término o matiz.</p><a href={`/en/homeopathy/remedies/${slug}`} target="_blank" rel="noopener noreferrer">Abrir versión de origen en inglés ↗</a><a href={`/ru/homeopathy/remedies/${slug}`} target="_blank" rel="noopener noreferrer">Abrir original en ruso ↗</a>{remedy.primary_source_url && <a href={remedy.primary_source_url} target="_blank" rel="noopener noreferrer">Fuente original en Telegram ↗</a>}<span>Referencia: {remedy.primary_source_message || remedy.source_heading}</span>{remedy.source_date && <span>Fecha de la fuente: {remedy.source_date}</span>}</div></details>
    {supporting.length > 0 && <section className="remedy-supporting-gallery" aria-label="Imágenes adicionales de la fuente"><p>Imágenes adicionales de los mensajes originales relacionados</p><div>{supporting.map((image, index) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img key={image} src={image} alt={`${alt} — ${index + 2}`} loading="lazy" decoding="async" />
    ))}</div></section>}
    {related.length > 0 && <section className="remedy-related"><h2>Remedios relacionados</h2><ul>{related.map(item => <li key={item.slug}><Link href={`/es/homeopathy/remedies/${item.slug}`}>{item.canonical_latin_name}</Link></li>)}</ul></section>}
    <p className="remedy-disclaimer">Este material no sustituye el diagnóstico, el tratamiento ni el consejo de un profesional cualificado. No cambies un tratamiento prescrito basándote en este archivo.</p>
  </article></main>;
}
