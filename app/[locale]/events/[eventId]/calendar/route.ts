import { NextResponse } from "next/server";

import { PUBLIC_EVENTS } from "@/data/public-events";
import { metadataBaseFor } from "@/data/site-metadata";
import { createPublicEventCalendar } from "@/lib/public-event-calendar";
import type { PublicLocale } from "@/lib/public-locales";

const locales: readonly PublicLocale[] = ["en", "ru", "es"];
type Context = { params: Promise<{ locale: string; eventId: string }> };

// Calendar availability changes when a confirmed event begins.
export const revalidate = 300;

export async function GET(_request: Request, { params }: Context) {
  const { locale, eventId } = await params;
  if (!locales.includes(locale as PublicLocale)) return new NextResponse(null, { status: 404 });
  const event = PUBLIC_EVENTS.find((item) => item.id === eventId);
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
