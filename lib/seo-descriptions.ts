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
    .replace(/[`*_~|]/g, "")
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
  en: name => `${name}: educational remedy notes by the Holistic House author, with source context and related materials. Open the full library entry.`,
  ru: name => `${name}: образовательная карточка в Holistic House с текстом автора и контекстом источника. Подробнее в справочнике препаратов.`,
  es: name => `${name}: ficha educativa del autor en Holistic House, con el contexto de origen y referencias relacionadas. Consulta el texto completo.`,
};

const bookFallback: Record<SeoLanguage, (name: string) => string> = {
  en: name => `${name}. Explore this author's book in the Holistic House library, including its subjects, original materials and full reading edition.`,
  ru: name => `${name}. Познакомьтесь с этой книгой в библиотеке Holistic House: разделы, материалы автора и полное издание для чтения.`,
  es: name => `${name}. Explora este libro y sus materiales originales en la biblioteca de Holistic House, con información sobre los temas y la edición.`,
};

export function remedySeoDescription(name: string, body: string, locale: SeoLanguage) {
  const opening = completeSentence(body, 150 - name.length - 2);
  const proposed = opening ? `${name}: ${opening}` : "";
  if (proposed.length >= 120 && proposed.length <= 160) return proposed;
  const fallback = finish(remedyFallback[locale](name));
  if (fallback.length <= 160 && fallback.length >= 120) return fallback;
  // Long compound Latin names cannot make a safe 160-character description
  // using the usual template; use a shorter complete sentence instead.
  const compact: Record<SeoLanguage, string> = {
    en: `${name}: explore its original author notes and references in the Holistic House educational remedy library.`,
    ru: `${name}: авторский образовательный материал в библиотеке препаратов Holistic House. Откройте текст и источники.`,
    es: `${name}: consulta las notas originales y referencias del autor en el catálogo educativo de Holistic House.`,
  };
  const shorter = finish(compact[locale]);
  return shorter.length <= 160 ? shorter : finish({
    en: "Educational remedy reference from the Holistic House author archive. Explore the complete entry, original context and related source materials.",
    ru: "Образовательный справочник препаратов Holistic House. Ознакомьтесь с текстом автора, источниками и дополнительными материалами.",
    es: "Biblioteca educativa de remedios Holistic House. Consulta el texto completo, el contexto original y las referencias relacionadas.",
  }[locale]);
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
  const fallback = finish(bookFallback[locale](name));
  if (fallback.length >= 120 && fallback.length <= 160) return fallback;
  const compact: Record<SeoLanguage, string> = {
    en: `${name}. Explore the author's book and its complete reading edition in the Holistic House library.`,
    ru: `${name}. Изучите книгу и полное авторское издание в библиотеке Holistic House.`,
    es: `${name}. Consulta la edición y los materiales de este libro en Holistic House.`,
  };
  const shorter = finish(compact[locale]);
  if (shorter.length >= 120 && shorter.length <= 160) return shorter;
  const suffix = locale === 'ru' ? ' Материал опубликован в авторском образовательном архиве.'
    : locale === 'es' ? ' Incluye el material educativo original del autor.'
    : ' Includes the original educational material by the author.';
  if (shorter.length < 120 && (shorter + suffix).length <= 160) return shorter + suffix;
  return finish({
    en: "Discover published books and educational materials by the Holistic House author, with a library overview and links to available full-text editions.",
    ru: "Книги и учебные материалы автора Holistic House: описания тем, структура разделов и доступные полные издания в библиотеке проекта.",
    es: "Explora los libros y materiales educativos del autor de Holistic House, con información de los temas y enlaces a las ediciones completas.",
  }[locale]);
}
