export type SymptomLocale = "ru" | "en" | "es";
export const remedySymptomSlugs: readonly string[];
export function getRemedySymptoms(slug: string, locale: SymptomLocale): readonly string[];
export function isBachEssence(slug: string): boolean;
