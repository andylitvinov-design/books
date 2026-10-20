import { ServicesDirectoryPage } from "@/components/services-directory-page";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = spanishMetadata(
  "/es/services/catalog",
  "Directorio de servicios y profesionales | Holistic House",
  "Busca servicios según tu objetivo, formato y presupuesto y consulta con el profesional."
);

export default function SpanishServicesDirectoryRoute() {
  return <ServicesDirectoryPage locale="es" />;
}
