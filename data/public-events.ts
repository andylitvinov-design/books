import type { PublicLocale } from "@/lib/public-locales";

export type PublicEventCategory = "somatic" | "connection" | "reiki" | "temple";
export type PublicEventFormat = "in_person" | "online";
export type PublicEvent = {
  id: string;
  category: PublicEventCategory;
  format: PublicEventFormat;
  startsAt: string; // Verified ISO date + time with offset, e.g. 2026-11-10T18:00:00-05:00.
  timeZone: string; // IANA zone such as America/Toronto.
  city?: string;
  location?: string; // Publicly approved venue only.
  title: Record<PublicLocale, string>;
  description: Record<PublicLocale, string>;
  registrationHref: string; // Approved, publicly accessible booking page.
  status: "published";
};

/** Public event dates go here only after organizer approval of time, venue and link.
 * Do not automatically transform past programs into "upcoming" sessions. */
export const PUBLIC_EVENTS: readonly PublicEvent[] = [];
