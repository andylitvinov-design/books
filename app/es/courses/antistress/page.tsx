import { PublicAntistressLanding } from "@/components/public-antistress-landing";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata(
  "/es/courses/antistress",
  "OPORA Antiestrés — 14 días y 6 rutas | Holistic House",
  "Un programa de Antiestrés de 14 días con seis rutas personalizadas, prácticas educativas y seguimiento voluntario. La ruta clínica requiere un profesional."
);

export default function SpanishAntiStressPage() {
  return <PublicAntistressLanding locale="es" />;
}
