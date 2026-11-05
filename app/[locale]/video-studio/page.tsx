import { notFound, redirect } from "next/navigation";
import { isPublicLocale } from "@/data/academy/catalog";

// One public, guest-safe URL for Telegram, WhatsApp and shared invitations.
// Reuse the canonical production editor: no duplicate renderer or uploads.
type Props = { params: Promise<{ locale: string }> };

export default async function VideoStudioPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  redirect(`/${locale}/holistic-support/mandala`);
}
