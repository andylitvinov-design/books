import type { PublicLocale } from "@/lib/public-locales";

export type PublicEventCategory = "somatic" | "connection" | "reiki" | "temple";
export type PublicEventFormat = "in_person" | "online";
export type PublicEvent = {
  id: string;
  category: PublicEventCategory;
  format: PublicEventFormat;
  startsAt: string; // Verified ISO date + time with offset, e.g. 2026-11-10T18:00:00-05:00.
  endsAt?: string; // Organizer-confirmed end time, if known.
  timeZone: string; // IANA zone such as America/Toronto.
  city?: string;
  location?: string; // Publicly approved venue only.
  relatedCategories?: readonly PublicEventCategory[];
  posterUrl?: string; // Public organizer artwork, served without Vercel transforms.
  highlights?: Record<PublicLocale, readonly string[]>;
  title: Record<PublicLocale, string>;
  description: Record<PublicLocale, string>;
  registrationHref: string; // Approved, publicly accessible booking page.
  status: "published";
};

/** Public event dates go here only after organizer approval of time, venue and link.
 * Do not automatically transform past programs into "upcoming" sessions. */
export const PUBLIC_EVENTS: readonly PublicEvent[] = [
  {
    id: "love-magic-tarot-initiations-2026-10-25",
    category: "temple",
    relatedCategories: ["reiki"],
    format: "in_person",
    startsAt: "2026-10-25T19:00:00-04:00",
    endsAt: "2026-10-25T22:00:00-04:00",
    timeZone: "America/Toronto",
    city: "Toronto, ON",
    location: "665 Dupont Street, Toronto, ON M6G 1Z5",
    title: {
      en: "Love Magic & Tarot Initiations",
      ru: "Магия любви и инициации Таро",
      es: "Magia del amor e iniciaciones del Tarot",
    },
    description: {
      en: "A three-hour practical workshop exploring Tantra Reiki, Tarot energies, rituals for personal transformation and working with goals. Individual, partner and group experiences. No experience required.",
      ru: "Трёхчасовой практический семинар по Тантра Рейки, энергиям Таро и ритуалам личной трансформации и работы с целями. Личные, парные и групповые практики. Опыт не требуется.",
      es: "Un taller práctico de tres horas sobre Tantra Reiki, energías del Tarot y rituales de transformación personal y trabajo con metas. Prácticas individuales, en pareja y en grupo. No se necesita experiencia.",
    },
    highlights: {
      en: ["Awakening inner energy and intuition", "Partner energy work and energetic sensitivity", "Initiation into the Major Arcana of Tarot", "Rituals for personal goals and transformation", "Techniques for independent practice"],
      ru: ["Пробуждение внутренней энергии и интуиции", "Парная практика и развитие энергетической чувствительности", "Инициация в энергии Старших Арканов Таро", "Ритуалы для личных целей и изменений", "Техники для самостоятельной практики"],
      es: ["Despertar de la energía interior y la intuición", "Práctica en pareja y sensibilidad energética", "Iniciación en los Arcanos Mayores del Tarot", "Rituales para metas y transformación personal", "Técnicas para la práctica independiente"],
    },
    posterUrl: "https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1194324777%2F2750388550641%2F1%2Foriginal.20260924-225208?crop=focalpoint&fit=crop&w=940&auto=format%2Ccompress&q=75&sharp=10&fp-x=0.522&fp-y=0.32&s=aa8a369eebfb7e197b5e2f28d6b5573f",
    registrationHref: "https://www.eventbrite.ca/e/love-magic-tarot-initiations-tickets-2003517510808",
    status: "published",
  }
];
