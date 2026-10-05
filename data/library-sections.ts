import type { PublicLocale } from "@/lib/public-locales";

export const bookSectionKeys = ["alchemy", "dao", "maya"] as const;

export type BookSectionKey = (typeof bookSectionKeys)[number];

export function parseBookSection(value: string | string[] | undefined): BookSectionKey | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return bookSectionKeys.includes(raw as BookSectionKey) ? raw as BookSectionKey : undefined;
}

export const bookSectionTitles: Record<PublicLocale, Record<BookSectionKey, string>> = {
  en: {
    alchemy: "Alchemy of the Soul",
    dao: "Daoist tradition",
    maya: "Maya tradition",
  },
  ru: {
    alchemy: "Алхимия души",
    dao: "Даосская традиция",
    maya: "Традиция Майя",
  },
  es: {
    alchemy: "Alquimia del Alma",
    dao: "Tradición taoísta",
    maya: "Tradición maya",
  },
};

export const bookSectionLeads: Record<"en" | "ru", Record<BookSectionKey, string>> = {
  en: {
    alchemy: "Books and guides from the Alchemy of the Soul collection.",
    dao: "Books on Daoist tradition, alchemy, symbolism, healing, and practice.",
    maya: "Books on the Maya and Aztec tradition, calendar, myths, and mysteries.",
  },
  ru: {
    alchemy: "Книги и методические материалы серии «Алхимия души».",
    dao: "Книги о даосской традиции, алхимии, символике, целительстве и практике.",
    maya: "Книги о традиции Майя и Ацтеков, календаре, мифах и мистериях.",
  },
};
