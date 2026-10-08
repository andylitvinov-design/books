import { AppEntryLink } from '@/components/app/app-entry-link';
import { redirect } from 'next/navigation';
import { currentCabinetAccess } from '@/lib/clients/session';
export const dynamic = 'force-dynamic';
import { PublicSiteHeader } from '@/components/public-site-header';
import { ClientCabinetEntry } from '@/components/client-cabinet-entry';
import Link from 'next/link';
import { spanishMetadata } from '@/lib/spanish-metadata';
export const metadata = { ...spanishMetadata('/es/client', 'Área de clientes — Holistic House', 'Accede a tu área privada de Holistic House.'), robots: { index: false, follow: false } };
export default async function SpanishClientEntryPage() {
  const session = await currentCabinetAccess();
  if (session) redirect(`/en/client/${session.selector}`);
  return <main className="client-entry-shell" lang="es"><PublicSiteHeader locale="es" /><AppEntryLink locale="es" /><section className="client-entry-card"><h2>Conoce tu estado actual</h2><p>Explora las pruebas disponibles en español. Los cuestionarios y los resultados se presentan en su idioma original, actualmente inglés o ruso.</p><Link className="personal-consultation-submit" href="/es/client/tests">Explorar pruebas de autoobservación →</Link></section><section className="client-entry-card" aria-labelledby="client-entry-title"><p className="about-kicker">Acceso privado</p><h1 id="client-entry-title">Área de clientes</h1><p>Pega el enlace privado que recibiste de Andy. El enlace se intercambia por una sesión segura del navegador y después se elimina de la barra de direcciones.</p><ClientCabinetEntry locale="en" displayLocale="es" /></section><p><Link href="/es/privacy">Privacidad</Link> · <Link href="/es/terms">Condiciones de uso</Link></p></main>;
}
