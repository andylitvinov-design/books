import type { Metadata } from "next";
import { PublicNotFound } from "@/components/public-not-found";

export const metadata: Metadata = {
  title: "404 — Holistic House",
  description: "No encontramos esta página. Explora los servicios, recursos gratuitos y el catálogo de remedios de Holistic House.",
  robots: { index: false, follow: true },
};

export default function SpanishNotFound() {
  return <PublicNotFound locale="es" />;
}
