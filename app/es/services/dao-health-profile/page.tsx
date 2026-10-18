import { PublicSiteHeader } from "@/components/public-site-header";
import { CoreServiceDetail } from "@/components/core-service-detail";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata(
  "/es/services/dao-health-profile",
  "Perfil gratuito de recursos Wu Xing — Holistic House",
  "Explora tus recursos personales mediante una guía simbólica Dao / Wu Xing, gratuita y no diagnóstica.",
);

export default function SpanishCoreServicePage() {
  return <><PublicSiteHeader locale="es" /><CoreServiceDetail locale="es" kind="dao" /></>;
}
