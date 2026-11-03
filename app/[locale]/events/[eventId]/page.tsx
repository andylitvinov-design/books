import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { EventDetailActions } from "@/components/public-event-actions";
import { PUBLIC_EVENTS, type PublicEvent } from "@/data/public-events";
import { metadataBaseFor } from "@/data/site-metadata";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./event-detail.module.css";

type Props = { params: Promise<{ locale: string; eventId: string }> };

// The upcoming/past CTA and indexability must change after the real start time.
export const revalidate = 300;

const locales: readonly PublicLocale[] = ["en", "ru", "es"];
const isLocale = (value: string): value is PublicLocale => locales.includes(value as PublicLocale);

const copy = {
  en: {
    back: "All events", upcoming: "Upcoming gathering", past: "Past gathering",
    inPerson: "In person", online: "Online", program: "What we'll explore",
    registration: "View registration", pastNotice: "This event has finished. Browse upcoming gatherings instead.",
    other: "Explore personal services", note: "Tickets and availability are confirmed by the registration provider.",
  },
  ru: {
    back: "Все мероприятия", upcoming: "Ближайшая встреча", past: "Прошедшая встреча",
    inPerson: "Очно", online: "Онлайн", program: "Что будем изучать",
    registration: "Открыть регистрацию", pastNotice: "Мероприятие завершилось. Посмотрите будущие встречи.",
    other: "Личные услуги", note: "Наличие мест и условия билетов уточняйте на площадке регистрации.",
  },
  es: {
    back: "Todos los eventos", upcoming: "Próximo encuentro", past: "Encuentro anterior",
    inPerson: "Presencial", online: "En línea", program: "Qué exploraremos",
    registration: "Ver inscripción", pastNotice: "Este evento ya terminó. Descubre los próximos encuentros.",
    other: "Servicios personales", note: "Confirma las entradas y disponibilidad en la plataforma de inscripción.",
  },
} as const;

function publishedEvent(eventId: string): PublicEvent | undefined {
  return PUBLIC_EVENTS.find((item) =>
    item.id === eventId && item.status === "published"
    && Number.isFinite(Date.parse(item.startsAt))
    && /(?:Z|[+-]\d\d:\d\d)$/.test(item.startsAt)
    && (item.registrationHref.startsWith("/") || item.registrationHref.startsWith("https://")));
}

function eventPath(locale: PublicLocale, event: PublicEvent) {
  return "/" + locale + "/events/" + encodeURIComponent(event.id);
}

function eventTime(event: PublicEvent, locale: PublicLocale) {
  const language = locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-CA";
  const first = new Intl.DateTimeFormat(language, {
    dateStyle: "full", timeStyle: "short", timeZone: event.timeZone,
  }).format(new Date(event.startsAt));
  if (!event.endsAt || !Number.isFinite(Date.parse(event.endsAt))) return first;
  const last = new Intl.DateTimeFormat(language, {
    timeStyle: "short", timeZone: event.timeZone,
  }).format(new Date(event.endsAt));
  return first + " – " + last;
}

function eventJsonLd(event: PublicEvent, locale: PublicLocale) {
  // Do not advertise unconfirmed venues, ticket prices or private registration data.
  // Google Event markup is only suitable here with an organizer-confirmed postal address.
  if (event.format !== "in_person" || !event.structuredLocation) return null;
  const address = event.structuredLocation;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title[locale],
    description: event.description[locale],
    startDate: event.startsAt,
    ...(event.endsAt ? { endDate: event.endsAt } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: new URL(eventPath(locale, event), metadataBaseFor()).href,
    ...(event.posterUrl ? { image: [event.posterUrl] } : {}),
    location: {
      "@type": "Place",
      ...(address.venueName ? { name: address.venueName } : {}),
      address: {
        "@type": "PostalAddress",
        streetAddress: address.streetAddress,
        addressLocality: address.addressLocality,
        addressRegion: address.addressRegion,
        ...(address.postalCode ? { postalCode: address.postalCode } : {}),
        addressCountry: address.addressCountry,
      },
    },
    ...(event.organizerName ? {
      organizer: {
        "@type": "Organization",
        name: event.organizerName,
        ...(event.organizerHref?.startsWith("https://") ? { url: event.organizerHref } : {}),
      },
    } : {}),
    // Do not emit Offer until ticket price, currency and availability are verified.
  };
}

export function generateStaticParams() {
  return PUBLIC_EVENTS.filter(event => publishedEvent(event.id))
    .flatMap(event => locales.map(locale => ({ locale, eventId: event.id })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, eventId } = await params;
  if (!isLocale(locale)) return { title: "Not found" };
  const event = publishedEvent(eventId);
  if (!event) return { title: "Not found", robots: { index: false } };
  const languages = Object.fromEntries(locales.map(l => [l, eventPath(l, event)]));
  return {
    metadataBase: metadataBaseFor(),
    title: event.title[locale] + " | Holistic House",
    description: event.description[locale],
    alternates: {
      canonical: eventPath(locale, event),
      languages: { ...languages, "x-default": eventPath("en", event) },
    },
    ...(event.posterUrl ? {
      openGraph: {
        type: "website",
        title: event.title[locale],
        description: event.description[locale],
        images: [{ url: event.posterUrl, alt: event.title[locale] }],
      },
    } : {}),
    ...(Date.parse(event.startsAt) < Date.now() ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { locale, eventId } = await params;
  if (!isLocale(locale)) notFound();
  const event = publishedEvent(eventId);
  if (!event) notFound();
  const t = copy[locale];
  const ended = Date.parse(event.startsAt) < Date.now();
  const jsonLd = eventJsonLd(event, locale);
  return (
    <main className="library-shell academy-shell" lang={locale}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      {jsonLd && !ended ? (
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      ) : null}
      <div className={styles.wrap}>
        <Link href={"/" + locale + "/events"} className={styles.back}>
          <ArrowLeft size={16} aria-hidden="true" /> {t.back}
        </Link>
        <article className={styles.paper}>
          <div className={styles.poster}>
            <img
              src={event.posterUrl || "/images/holistic-house/video-posters/constellations-en-v1.webp"}
              alt="" loading="eager" decoding="async" width={940} height={492} />
          </div>
          <div className={styles.content}>
            <p className={styles.kicker}>{ended ? t.past : t.upcoming} · {event.format === "online" ? t.online : t.inPerson}</p>
            <h1>{event.title[locale]}</h1>
            <div className={styles.facts}>
              <p><CalendarDays size={18} aria-hidden="true" /><time dateTime={event.startsAt}>{eventTime(event, locale)}</time></p>
              <p><MapPin size={18} aria-hidden="true" />{event.format === "online" ? t.online : event.location || event.city}</p>
            </div>
            <p className={styles.summary}>{event.description[locale]}</p>
            {event.highlights?.[locale]?.length ? (
              <section aria-labelledby="event-program" className={styles.program}>
                <h2 id="event-program">{t.program}</h2>
                <ul>{event.highlights[locale].map((point, i) => <li key={i}>{point}</li>)}</ul>
              </section>
            ) : null}
            {event.organizerName && <p className={styles.organizer}>{event.organizerName}</p>}
            {ended ? (
              <p className={styles.note}>{t.pastNotice}</p>
            ) : (
              <div className={styles.actions}>
                <a href={event.registrationHref} target="_blank" rel="noopener noreferrer" className={styles.primary}>
                  {t.registration} <ArrowUpRight size={18} aria-hidden="true" />
                </a>
                <EventDetailActions
                  calendarHref={eventPath(locale, event) + "/calendar"}
                  className={styles.utilityActions}
                  actionClassName={styles.secondary}
                  locale={locale}
                  title={event.title[locale]}
                  url={new URL(eventPath(locale, event), metadataBaseFor()).href}
                />
                <small>{t.note}</small>
              </div>
            )}
          </div>
        </article>
        <Link className={styles.other} href={"/" + locale + "/services"}>{t.other} →</Link>
      </div>
    </main>
  );
}
