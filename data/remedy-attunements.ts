import archive from "./remedy-attunements.json";
import { getRemedyDirectory } from "./remedies";
import type { Locale, RemedyDirectoryEntry } from "./remedies";

export type RemedyAttunement = {
  id: string;
  message_id: number;
  title: string;
  form: "poem" | "group-poem" | "poetic-meditation";
  remedy_slugs: string[];
  text: string;
  source_date: string;
  source_url: string;
};
export type AttunementDirectoryEntry = RemedyDirectoryEntry & {
  poemCount: number;
  poemTitles: string[];
  poemSearchText: string;
};
export const remedyAttunements = archive.entries as RemedyAttunement[];
export function getRemedyAttunements(slug: string): RemedyAttunement[] {
  return remedyAttunements.filter((poem) => poem.remedy_slugs.includes(slug));
}
export function getAttunementDirectory(locale: Locale): AttunementDirectoryEntry[] {
  return getRemedyDirectory(locale).flatMap((entry) => {
    const found = getRemedyAttunements(entry.slug);
    return found.length ? [{
      ...entry,
      poemCount: found.length,
      poemTitles: found.map((poem) => poem.title),
      poemSearchText: [entry.searchText, entry.title, entry.commonName, ...entry.aliases,
        ...found.map((poem) => poem.title), ...found.map((poem) => poem.text)].join(" "),
    }] : [];
  });
}
export function getAttunementRouteParams(): Array<{ locale: Locale; slug: string }> {
  return (["ru", "en"] as const).flatMap((locale) =>
    getAttunementDirectory(locale).map(({ slug }) => ({ locale, slug })));
}
