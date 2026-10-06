import type { Remedy, RemedyDescriptionType } from './remedies';
export type SpanishRemedy = Omit<Remedy, 'locale'> & { locale: 'es' };
export type SpanishRemedyEntry = { slug: string; title: string; letter: string; aliases: string[]; searchText: string; summary: string; descriptionType: RemedyDescriptionType };
export function getSpanishRemedy(slug: string): SpanishRemedy | undefined;
export function getSpanishRemedySlugs(): string[];
export function getSpanishRemedyDirectory(): SpanishRemedyEntry[];
