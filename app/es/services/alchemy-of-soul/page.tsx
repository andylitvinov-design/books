import { PublicSiteHeader } from "@/components/public-site-header";
import { CoreServiceDetail } from "@/components/core-service-detail";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata(
  "/es/services/alchemy-of-soul",
  "Alquimia del Alma · Psicohomeopatía — Holistic House",
  "Sesiones personales con constelaciones sistémicas, imágenes guiadas y recursos complementarios opcionales. En línea o en Toronto.",
);

export default function SpanishCoreServicePage() {
  return <><PublicSiteHeader locale="es" /><CoreServiceDetail locale="es" kind="alchemy" /></>;
}
