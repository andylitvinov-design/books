import type { Metadata } from "next";
import { DaoHexagramsIndex } from "@/components/dao-hexagram-pages";
import { metadataBaseFor } from "@/data/site-metadata";
export const metadata: Metadata = {
  metadataBase: metadataBaseFor(),
  title: "64 hexagramas del I Ching — Holistic House",
  description: "Explora 64 hexagramas con imágenes, referencias tradicionales y 12 interpretaciones originales en ruso.",
  alternates: { canonical: "/es/dao/hexagrams",
    languages: { en: "/en/dao/hexagrams", ru: "/ru/dao/hexagrams", es: "/es/dao/hexagrams", "x-default": "/en/dao/hexagrams" } },
};
export default function Page() { return <DaoHexagramsIndex locale="es" />; }
