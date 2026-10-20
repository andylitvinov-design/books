import { PublicSiteHeader } from "@/components/public-site-header";
import { AlchemySoulLanding } from "@/components/alchemy-soul-landing";
import { DistanceHomeopathyGuide } from "@/components/distance-homeopathy-guide";
import { spanishMetadata } from "@/lib/spanish-metadata";
import styles from "@/components/alchemy-soul-landing.module.css";

export const metadata = spanishMetadata(
  "/es/services/alchemy-of-soul",
  "Alquimia del Alma · Psicohomeopatía — Holistic House",
  "Explora una situación mediante constelaciones, hipnoterapia con imágenes guiadas y psicohomeopatía opcional. Sesiones personales con Andrey Litvinov, en línea o en Toronto.",
);

export default function SpanishAlchemyOfTheSoulPage() {
  return (
    <>
      <PublicSiteHeader locale="es" />
      <AlchemySoulLanding locale="es" />
      <details className={styles.guideDisclosure} data-alchemy-extended-guide>
        <summary>Lectura opcional: guía completa sobre homeopatía a distancia</summary>
        <DistanceHomeopathyGuide locale="es" embedded />
      </details>
    </>
  );
}
