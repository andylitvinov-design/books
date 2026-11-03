export type MyTubeLocale = "ru" | "en" | "es";

export const MYTUBE_TAXONOMY_VERSION: string;
export const MYTUBE_TAXONOMY_COUNTS: Readonly<{
  categories: 4;
  subcategories: 16;
  topics: 64;
  scenarios: 256;
}>;

export interface MyTubeCategory {
  id: string;
  label: string;
  subcategoryCount: number;
}
export interface MyTubeSubcategory {
  id: string;
  label: string;
  chooseWhen: string;
}
export interface MyTubeTopic {
  id: string;
  label: string;
  searchTerms: string[];
  scenarioCount: number;
}
export interface MyTubeScenario {
  id: string;
  label: string;
  archetype: string;
  creativeBrief: string;
  sourceStatus: string;
  canExport: false;
}

export function listMyTubeCategories(locale?: MyTubeLocale | string): MyTubeCategory[];
export function listMyTubeSubcategories(categoryId: string, locale?: MyTubeLocale | string): MyTubeSubcategory[];
export function listMyTubeTopics(categoryId: string, subcategoryId: string, locale?: MyTubeLocale | string): MyTubeTopic[];
export function getMyTubeTopic(topicId: string): {
  category: unknown;
  subcategory: unknown;
  topic: unknown;
} | null;
export function listMyTubeScenarios(topicId: string, locale?: MyTubeLocale | string): MyTubeScenario[];
export function resolveMyTubeTopic(query: string, locale?: MyTubeLocale | string): {
  categoryId: string;
  subcategoryId: string;
  topicId: string;
} | null;
export function auditMyTubeTaxonomy(): {
  ok: boolean;
  counts: { categories: number; subcategories: number; topics: number; scenarios: number };
  uniqueScenarioTitles: Record<MyTubeLocale, number>;
  errors: string[];
};
