import { FreeEntryLanding } from "@/components/free-entry-landing";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata(
  "/es/services/dao-health-profile",
  "Perfil gratuito de recursos Wu Xing — Holistic House",
  "Explora tus recursos personales mediante una guía simbólica Dao / Wu Xing, gratuita y no diagnóstica.",
);

export default function SpanishCoreServicePage() {
  return <FreeEntryLanding locale="es" kind="dao" />;
}
