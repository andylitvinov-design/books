export type RemedySimilarity = { slug: string; matchedSymptoms: string[] };
export type RemedySimilarityResult = { status: "matches" | "insufficient" | "urgent"; matches: RemedySimilarity[] };
export function containsUrgentSymptoms(value: unknown): boolean;
export function rankRemedyDescriptions(query: unknown, profiles: Array<{ slug: string; symptoms: string[] }>, limit?: number): RemedySimilarityResult;
export function matchRemedyDescriptions(query: unknown, locale?: string, limit?: number): RemedySimilarityResult;
