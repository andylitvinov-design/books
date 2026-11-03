import { PublicCourseMethodology } from "@/components/public-course-methodology";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata(
  "/es/courses/methodology",
  "Método OPORA — fundamentos de nuestros cursos | Holistic House",
  "Cinco pasos, 14 lecciones y una ruta personalizada con bases en la TCC, ACT y la ciencia del cambio de conducta."
);

export default function SpanishMethodologyPage() {
  return <PublicCourseMethodology locale="es" />;
}
