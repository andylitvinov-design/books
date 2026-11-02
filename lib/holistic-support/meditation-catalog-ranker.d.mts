import type { MeditationCatalogRecord, MeditationMatch, MeditationRequest } from "./meditation-catalog-types";
export function rankMeditationCatalog(input?: {
  videos?: MeditationCatalogRecord[];
  request?: MeditationRequest;
  editorialPreview?: boolean;
  publishedSourceIds?: string[];
}): MeditationMatch[];
