import { PublicGrowthCourses } from "@/components/public-growth-courses";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata(
  "/es/courses",
  "Mis cursos — programas gratuitos de 14 días | Holistic House",
  "Estrés, confianza, enfoque y un programa personal. Elige tu objetivo, realiza pruebas y avanza una lección cada vez."
);
export default function SpanishCoursesPage() { return <PublicGrowthCourses locale="es" />; }
