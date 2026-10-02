import { PublicSiteHeader } from '@/components/public-site-header';
import { ClientCabinetEntry } from '@/components/client-cabinet-entry';
import { spanishMetadata } from '@/lib/spanish-metadata';
export const metadata = { ...spanishMetadata('/es/client', 'Área de clientes — Holistic House', 'Accede a tu área privada de Holistic House.'), robots: { index: false, follow: false } };
export default function SpanishClientEntryPage() {
  return <main className="client-entry-shell" lang="es"><PublicSiteHeader locale="es" /><section className="client-entry-card" aria-labelledby="client-entry-title"><p className="about-kicker">Acceso privado</p><h1 id="client-entry-title">Área de clientes</h1><p>Pega el enlace privado que recibiste de Andy. El enlace se intercambia por una sesión segura del navegador y después se elimina de la barra de direcciones.</p><ClientCabinetEntry locale="en" displayLocale="es" /></section></main>;
}
