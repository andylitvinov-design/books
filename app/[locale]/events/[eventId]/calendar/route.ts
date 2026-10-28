import { NextResponse } from "next/server";

import { PUBLIC_EVENTS } from "@/data/public-events";
import { findPublishedPractitionerEvent } from "@/lib/practitioners/public-event-resolver";
import { metadataBaseFor } from "@/data/site-metadata";
import { createPublicEventCalendar } from "@/lib/public-event-calendar";
import type { PublicLocale } from "@/lib/public-locales";

const locales: readonly PublicLocale[] = ["en", "ru", "es"];
type Context = { params: Promise<{ locale: string; eventId: string }> };

// Do not cache calendar files for cancelled, paused or already-started events.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: Request, { params }: Context) {
  const { locale, eventId } = await params;
  if (!locales.includes(locale as PublicLocale)) return new NextResponse(null, { status: 404 });
  const event = PUBLIC_EVENTS.find((item) => item.id === eventId && item.status === "published")
    ?? await findPublishedPractitionerEvent(eventId);
  if (!event) return new NextResponse(null, { status: 404 });
  const eventPath = "/" + locale + "/events/" + encodeURIComponent(event.id);
  const calendar = createPublicEventCalendar(event, {
    locale,
    publicUrl: new URL(eventPath, metadataBaseFor()).href,
  });
  if (!calendar) return new NextResponse(null, { status: 404 });

  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=holistic-house-event.ics",
      "Cache-Control": "public, max-age=300",
    },
  });
}
