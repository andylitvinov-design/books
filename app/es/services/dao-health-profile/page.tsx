import { FreeEntryLanding } from "@/components/free-entry-landing";
import { spanishMetadata } from "@/lib/spanish-metadata";

// A legacy locale-specific /es route takes precedence over [locale] in Next.js.
// Reuse the same EN/RU/ES one-contact experience instead of a duplicate old form.
export const metadata = spanishMetadata(
  "/es/services/dao-health-profile",
  "Perfil gratuito de recursos Wu Xing | Holistic House",
  "Explora tus recursos mediante un perfil simbólico gratuito Wu Xing. Un contacto es suficiente para solicitarlo; no es un diagnóstico médico.",
);

export default function SpanishWuXingProfilePage() {
  return <FreeEntryLanding locale="es" kind="dao" />;
}
