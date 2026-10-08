import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PublicTestExplorer } from "@/components/app/public-test-explorer";
import { spanishMetadata } from "@/lib/spanish-metadata";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
 ...spanishMetadata("/es/client/tests","Pruebas de autoobservación — Holistic House","Elige cuestionarios y conoce qué herramientas de autoobservación están disponibles."),
 robots: { index: false, follow: false },
};
export default function SpanishTestExplorerPage() {
 return <main lang="es"><PublicSiteHeader locale="es" /><section className="client-entry-card"><p>Selección de cuestionarios</p><p>La navegación para elegir las pruebas está en español. Algunas preguntas y resultados completos se presentan en su idioma original (inglés o ruso); al iniciar una prueba, la aplicación continuará en inglés.</p><Link href="/es/client">← Volver al área personal</Link></section><PublicTestExplorer locale="es" /></main>;
}
