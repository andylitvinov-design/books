import type {Metadata} from "next";
import {HolisticHouseHome} from "@/components/holistic-house-home";
import {spanishMetadata} from "@/lib/spanish-metadata";
export const metadata:Metadata=spanishMetadata("/es",
  "Holistic House · Tu espacio personal y profesional",
  "Pregunta, aprende o crea en Holistic House. Empieza un diálogo y descubre cursos, tests y ayuda personal.");
export default function SpanishHomePage(){
  return <HolisticHouseHome locale="es"/>;
}
