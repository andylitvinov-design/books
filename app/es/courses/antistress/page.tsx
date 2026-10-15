import { PublicAntistressLanding } from "@/components/public-antistress-landing";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata(
  "/es/courses/antistress",
  "OPORA Antiestrés — Seis módulos de 14 días | Holistic House",
  "Un programa de Antiestrés con seis módulos de 14 días, evaluaciones iniciales breves, elección personal y ejercicios educativos."
);

export default function SpanishAntiStressPage() {
  return <PublicAntistressLanding locale="es" />;
}
