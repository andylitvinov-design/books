import { notFound, permanentRedirect } from "next/navigation";
import { isPublicLocale } from "@/data/academy/catalog";

type Props = { params: Promise<{ locale: string }> };

// Backward compatibility: one canonical Holistic Support page, no duplicate forms.
export default async function LegacyTempleSupportPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  permanentRedirect("/" + locale + "/holistic-support");
}
