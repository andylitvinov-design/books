/**
 * Complete, locally appropriate SEO descriptions for published books and
 * remedy records. Never cut a medical/source sentence in the middle.
 */
export type SeoLanguage = "en" | "ru" | "es";

function plainText(input: string) {
  return input
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/^[#>*\s-]+/gm, "")
    .replace(/[\`*_~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function completeSentence(value: string, maxLength: number) {
  const clean = plainText(value);
  const match = clean.match(/^.{25,}?[.!?。！？](?=\s|$)/u);
  return match && match[0].length <= maxLength ? match[0] : "";
}

function finish(value: string) {
  const sentence = value.trim().replace(/[\s,;:—-]+$/g, "");
  return /[.!?。！？]$/.test(sentence) ? sentence : sentence + ".";
}

const remedyFallback: Record<SeoLanguage, (name: string) => string> = {
  en: name => `${name}: an educational reference from the Holistic House author's remedy archive, with original context and related reading. Explore the complete entry.`,
  ru: name => `${name}: справочная статья из авторской библиотеки Holistic House с описанием подхода, исходным контекстом и дополнительными материалами. Откройте карточку.`,
  es: name => `${name}: ficha educativa de la biblioteca del autor de Holistic House, con contexto original y materiales relacionados. Consulta la entrada completa.`,
};

const bookFallback: Record<SeoLanguage, (name: string) => string> = {
  en: name => `${name}. Explore this author's book in the Holistic House library, including its subjects, original materials and full reading edition.`,
  ru: name => `${name}. Познакомьтесь с этой книгой в библиотеке Holistic House: разделы, материалы автора и полное издание для чтения.`,
  es: name => `${name}. Explora este libro y sus materiales originales en la biblioteca de Holistic House, con información sobre los temas y la edición.`,
};

export function remedySeoDescription(name: string, body: string, locale: SeoLanguage) {
  const opening = completeSentence(body, 150 - name.length - 2);
  const proposed = opening ? `${name}: ${opening}` : "";
  return proposed.length >= 120 && proposed.length <= 160 ? proposed : finish(remedyFallback[locale](name)).slice(0, 160);
}

export function bookSeoDescription(name: string, body: string, locale: SeoLanguage) {
  const cleaned = plainText(body);
  const summary = finish(cleaned);
  if (summary.length >= 120 && summary.length <= 160) return summary;
  const next = locale === "ru" ? "Читайте полное издание в библиотеке Holistic House."
    : locale === "es" ? "Consulta la edición en la biblioteca de Holistic House."
    : "Read the full edition in the Holistic House library.";
  const combined = finish(cleaned) + " " + next;
  if (combined.length >= 120 && combined.length <= 160) return combined;
  return finish(bookFallback[locale](name)).slice(0, 160);
}
