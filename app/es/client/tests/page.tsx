import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PublicTestExplorer } from "@/components/app/public-test-explorer";
import { getTopicJourney, journeyFocusForTopics, journeyProblemsForTopics, normalizeJourneyFocus, normalizeJourneyTopicIds } from "@/lib/assessments/topic-journeys";
import { spanishMetadata } from "@/lib/spanish-metadata";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
 ...spanishMetadata("/es/client/tests","Pruebas de autoobservación — Holistic House","Elige cuestionarios y conoce qué herramientas de autoobservación están disponibles."),
 robots: { index: false, follow: false },
};
export default async function SpanishTestExplorerPage({ searchParams }: { searchParams: Promise<{ focus?: string | string[]; journey?: string | string[]; topics?: string | string[]; mode?: string | string[]; catalog?: string | string[] }> }) {
 const query = await searchParams;
 const journey = getTopicJourney(typeof query.journey === "string" ? query.journey : "");
 const chosenTopics = normalizeJourneyTopicIds(journey, typeof query.topics === "string" ? query.topics : "");
 const focus = journey ? journeyFocusForTopics(journey, chosenTopics) : normalizeJourneyFocus(typeof query.focus === "string" ? query.focus : "");
 const problems = journeyProblemsForTopics(journey, chosenTopics);
 return <main lang="es"><PublicSiteHeader locale="es" /><section className="client-entry-card"><p>Selección de cuestionarios</p><p>La navegación para elegir las pruebas está en español. Algunas preguntas y resultados completos se presentan en su idioma original (inglés o ruso); al iniciar una prueba, la aplicación continuará en inglés.</p><Link href="/es/client">← Volver al área personal</Link></section><PublicTestExplorer locale="es" embedded initialPreferences={focus.length ? { focus, problems } : null} initialMode={query.mode === "course" ? "course" : "tests"} initialBrowseFull={query.catalog === "full"} /></main>;
}
