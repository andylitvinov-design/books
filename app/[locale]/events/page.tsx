import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { EventsDiscovery } from "@/components/events-discovery";
import { PUBLIC_EVENTS } from "@/data/public-events";
import { metadataBaseFor } from "@/data/site-metadata";
import type { PublicLocale } from "@/lib/public-locales";

type Props = { params: Promise<{ locale: string }> };

const meta = {
  en: { title: "Events & Gatherings | Holistic House", description: "Explore Holistic House events, workshops and circles. Confirmed upcoming dates and registration links appear here." },
  ru: { title: "Мероприятия и встречи | Holistic House", description: "Мероприятия, мастер-классы и встречи Holistic House. Здесь публикуются только подтверждённые даты и ссылки для записи." },
  es: { title: "Eventos y encuentros | Holistic House", description: "Explora eventos, talleres y encuentros de Holistic House. Publicamos fechas y enlaces de inscripción confirmados." },
} as const;

const languages = { en: "/en/events", ru: "/ru/events", es: "/es/events", "x-default": "/en/events" };
const validLocale = (value: string): value is PublicLocale => value === "en" || value === "ru" || value === "es";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!validLocale(locale)) return { title: "Not found" };
  return {
    metadataBase: metadataBaseFor(),
    ...meta[locale],
    alternates: { canonical: "/" + locale + "/events", languages },
  };
}

export default async function EventsPage({ params }: Props) {
  const { locale } = await params;
  if (!validLocale(locale)) notFound();
  return (
    <main className="library-shell academy-shell" lang={locale}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <EventsDiscovery locale={locale} events={PUBLIC_EVENTS} />
    </main>
  );
}
