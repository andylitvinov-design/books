// Keep public search snippets complete and source-safe. Never truncate a remedy card in mid-sentence.
export type SearchLocale = "en" | "ru" | "es";

const remedyFallback: Record<SearchLocale, string> = {
  en: "Reference entry from Andrey Litvinov's educational homeopathy archive, with original source notes and related materials. This is not medical advice.",
  ru: "Справочная карточка из образовательного архива Андрея Литвинова с исходными материалами, описанием и связанными статьями. Не медицинский совет.",
  es: "Ficha de consulta del archivo educativo de homeopatía de Andrey Litvinov, con fuentes originales y materiales relacionados. No es asesoramiento médico.",
};

const bookFallback: Record<"en" | "ru", string> = {
  en: "Explore this published book in the Holistic House educational library, with original source materials, a chapter index and related reading from the author.",
  ru: "Изучите эту книгу в образовательной библиотеке Holistic House: главы, оригинальные авторские материалы и связанные тексты для дальнейшего чтения.",
};

export function remedySeoDescription(name: string, locale: SearchLocale): string {
  const prefix = locale === "ru"
    ? `${name} — справочная карточка из образовательного архива Андрея Литвинова с описанием и исходными материалами. Не медицинский совет.`
    : locale === "es"
      ? `Consulta la ficha de ${name} del archivo educativo de homeopatía de Andrey Litvinov, con fuentes y textos relacionados. No es consejo médico.`
      : `Read about ${name} in Andrey Litvinov's educational homeopathy archive, with original source notes and related materials. Not medical advice.`;
  return prefix.length <= 160 && prefix.length >= 120 ? prefix : remedyFallback[locale];
}

export function bookSeoDescription(raw: string, locale: "en" | "ru"): string {
  const normalized = raw.replace(/<[^>]+>/g, " ").replace(/\[[^\]]+\]\([^)]*\)/g, " ").replace(/[#*_~`]/g, "")
    .replace(/\s+/g, " ").trim();
  // Pick complete sentences only. A single full sentence is preferable to an
  // artificial snippet that stops in the middle of a book's description.
  const sentences = normalized.match(/[^.!?…]+[.!?…]+(?=\s|$)/gu) || [];
  let description = "";
  for (const sentence of sentences) {
    const candidate = [description, sentence.trim()].filter(Boolean).join(" ");
    if (candidate.length > 160) break;
    description = candidate;
  }
  return description.length >= 120 ? description : bookFallback[locale];
}
