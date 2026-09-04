export type Locale = "ru" | "en";

export type Remedy = {
  slug: string;
  locale: Locale;
  canonical_latin_name: string;
  russian_common_name: string;
  aliases: string;
  source_file: string;
  source_heading: string;
  source_author: string;
  source_status: string;
  related_slugs: string;
  translation_provenance: string;
  translation_source?: string;
  en_source_exists: "no";
  description: string;
};

export type RemedyDirectoryEntry = { slug: string; title: string; commonName: string; aliases: string[]; letter: string; searchText: string };
export const supportedLocales: Locale[];
export function isSupportedLocale(locale: string): locale is Locale;
export function getRemedy(locale: string, slug: string): Remedy | undefined;
export function getRemedyDirectory(locale: string): RemedyDirectoryEntry[];
export function getRemedyRouteParams(): Array<{ locale: Locale; slug: string }>;
export function getHomeopathyLocaleParams(): Array<{ locale: Locale }>;
export function getAlphabeticalRemedies(locale: string): Array<{ letter: string; remedies: RemedyDirectoryEntry[] }>;
export function searchRemedies(locale: string, query: string): RemedyDirectoryEntry[];
export function getRemedySwitchPath(locale: Locale, slug: string): string;
export function getRelatedRemedies(locale: string, remedy: Remedy): Remedy[];
