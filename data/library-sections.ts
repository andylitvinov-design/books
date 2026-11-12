import type { PublicLocale } from "@/lib/public-locales";

export const bookSectionKeys = ["alchemy", "dao", "maya", "egypt", "greek", "roman", "zoroastrian"] as const;

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
    egypt: "Egyptian tradition",
    greek: "Greek mysteries",
    roman: "Roman tradition",
    zoroastrian: "Zoroastrianism & Mithra",
  },
  ru: {
    alchemy: "Алхимия души",
    dao: "Даосская традиция",
    maya: "Традиция Майя",
    egypt: "Египетская традиция",
    greek: "Греческие мистерии",
    roman: "Римская традиция",
    zoroastrian: "Зороастризм и Митра",
  },
  es: {
    alchemy: "Alquimia del Alma",
    dao: "Tradición taoísta",
    maya: "Tradición maya",
    egypt: "Tradición egipcia",
    greek: "Misterios griegos",
    roman: "Tradición romana",
    zoroastrian: "Zoroastrismo y Mitra",
  },
};

export const bookSectionLeads: Record<"en" | "ru", Record<BookSectionKey, string>> = {
  en: {
    alchemy: "Books and guides from the Alchemy of the Soul collection.",
    dao: "Books on Daoist tradition, alchemy, symbolism, healing, and practice.",
    maya: "Books on the Maya and Aztec tradition, calendar, myths, and mysteries.",
    egypt: "Egyptian temple manuals and original ritual notes.",
    greek: "Greek temples, deity channels, and practical mysteries.",
    roman: "Roman temple sites and imperial archetypal notes.",
    zoroastrian: "Original studies on Zoroastrianism and Mithraic mysteries.",
  },
  ru: {
    alchemy: "Книги и методические материалы серии «Алхимия души».",
    dao: "Книги о даосской традиции, алхимии, символике, целительстве и практике.",
    maya: "Книги о традиции Майя и Ацтеков, календаре, мифах и мистериях.",
    egypt: "Методички египетской традиции, храмовые тексты и настройки.",
    greek: "Греческие храмы, каналы богов и мистериальные практики.",
    roman: "Римские святилища и императорские архетипы.",
    zoroastrian: "Зороастрийские и митраистские авторские материалы.",
  },
};
