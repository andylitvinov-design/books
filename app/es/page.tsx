import { Suspense } from "react";
import { HolisticHouseLoadingScene } from "@/components/holistic-house-loading-scene";
import { HolisticHouseHome } from "@/components/holistic-house-home";
import { spanishMetadata } from "@/lib/spanish-metadata";
export const metadata = spanishMetadata('/es', 'Sesiones personales en Toronto y en línea | Holistic House', 'Explora tus preguntas sobre relaciones, trabajo y decisiones con Andrey Litvinov. Sesiones personales desde €50 y revisión escrita gratuita opcional.');
export default function SpanishHomePage() {
 return <Suspense fallback={<HolisticHouseLoadingScene />}><HolisticHouseHome locale="es" /></Suspense>;
}
