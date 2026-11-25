export type SearchAspect = 'portrait'|'landscape'|'square';
export type SearchSourceType = 'all'|'licensed'|'animation';
export type SearchLocale = 'ru'|'en'|'es';
export interface VideoSceneSearchResult {
  status:'ok'|'no_matching_tags'|'empty_catalog'|'invalid_filters'|'invalid_query'|'unrecognized_query';
  total:number;
  items:Array<{
    id:string;sceneId:string;sourceType:'licensed_mp4'|'original_motion_mp4';
    label:string;video:string;poster:string|null;aspect:SearchAspect;pace:string;
    tags:string[];topicTags:string[];matchedTags:string[];missingTags:string[];
    score:number;evidence:'catalog_metadata_not_independently_frame_verified';
    requiresFinalComposerValidation:true;
  }>;
  matchedIntentTags?:string[];excludedIntentTags?:string[];
  partialMatches?:boolean;metadataOnly?:boolean;
}
export function parseVideoSearchIntent(query?:string):{
  valid:boolean;include:string[];exclude:string[];reason?:string;
};
export function videoSceneTagLabel(tag:string,locale?:SearchLocale):string;
export function searchApprovedVideoScenes(options?:{
  scenes?:readonly unknown[];query?:string;aspect?:SearchAspect|null;
  sourceType?:SearchSourceType;pace?:'slow'|'moderate'|'fast'|null;
  includeTags?:string[];excludeTags?:string[];excludedMotifs?:string[];
  limit?:number;locale?:SearchLocale;
  motifs?:readonly unknown[];styles?:readonly unknown[];
  topicsById?:Record<string,readonly unknown[]>;
}):VideoSceneSearchResult;
