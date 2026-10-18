import { PublicSiteHeader } from "@/components/public-site-header";
import { CoreServiceDetail } from "@/components/core-service-detail";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata(
  "/es/services/hypnotherapy-course",
  "Hipnoterapia con imágenes guiadas — Holistic House",
  "Sesiones individuales para explorar emociones, imágenes y recursos interiores con acompañamiento personal.",
);

export default function SpanishCoreServicePage() {
  return <><PublicSiteHeader locale="es" /><CoreServiceDetail locale="es" kind="hypnotherapy" /></>;
}
