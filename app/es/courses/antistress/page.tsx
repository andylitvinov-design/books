import { PublicAntistressLanding } from "@/components/public-antistress-landing";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata(
  "/es/courses/antistress",
  "OPORA Antiestrés — 14 días, 7 habilidades | Holistic House",
  "Curso gratuito OPORA Antiestrés: 14 lecciones interactivas, siete habilidades prácticas, apoyo personal y una forma amable de observar tu evolución."
);

export default function SpanishAntiStressPage() {
  return <PublicAntistressLanding locale="es" />;
}
