import "server-only";

import type { PublicEvent } from "@/data/public-events";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerEventsRepository } from "@/lib/practitioners/events-repository";

/**
 * A single server-only lookup for moderator-approved practitioner events.
 * The public directory and detailed event routes share the existing projection;
 * never expose drafts, paused events, source JSON or any attendee information.
 */
export async function findPublishedPractitionerEvent(eventId: string): Promise<PublicEvent | undefined> {
  if (!/^master-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(eventId)) {
    return undefined;
  }
  try {
    const events = await createPractitionerEventsRepository(getAppConfig()).publicEvents();
    return events.find((event: PublicEvent) => event.id === eventId && event.status === "published") as PublicEvent | undefined;
  } catch {
    // Private backend downtime must never surface draft or practitioner data.
    return undefined;
  }
}
