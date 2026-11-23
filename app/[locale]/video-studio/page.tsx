import { notFound, redirect } from "next/navigation";
import { isPublicLocale } from "@/data/academy/catalog";

// One public, guest-safe URL for Telegram, WhatsApp and shared invitations.
// Reuse the canonical production editor: no duplicate renderer or uploads.
type Props = { params: Promise<{ locale: string }>; searchParams?:Promise<{mode?:string}> };

export default async function VideoStudioPage({ params,searchParams }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const query=await searchParams;
  const mode=query?.mode==="gift"?"?mode=gift":"";
  redirect(`/${locale}/holistic-support/mandala${mode}`);
}
