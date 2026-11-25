import { permanentRedirect } from "next/navigation";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata(
  "/es/academy/free-ai-courses",
  "Mis cursos — OPORA Antiestrés, 14 lecciones | Holistic House",
  "El curso disponible ahora es OPORA Antiestrés: 14 lecciones, siete habilidades prácticas y herramientas suaves para el estrés cotidiano."
);
export default function SpanishCoursesPage() { permanentRedirect("/es/academy/free-ai-courses"); }
