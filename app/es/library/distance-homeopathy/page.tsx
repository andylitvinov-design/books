import type { Metadata } from "next";

import { DistanceHomeopathyGuide, distanceHomeopathyMetadata } from "@/components/distance-homeopathy-guide";
import { metadataBaseFor } from "@/data/site-metadata";

const text = distanceHomeopathyMetadata("es");

export const metadata: Metadata = {
  metadataBase: metadataBaseFor(),
  title: `${text.title} — Holistic House`,
  description: text.description,
  alternates: {
    canonical: "/es/library/distance-homeopathy",
    languages: {
      ru: "/ru/library/distance-homeopathy",
      en: "/en/library/distance-homeopathy",
      es: "/es/library/distance-homeopathy",
    },
  },
};

export default function SpanishDistanceHomeopathyPage() {
  return <DistanceHomeopathyGuide locale="es" />;
}
