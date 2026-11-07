export type DiscoveryVideo = {
  id:string;
  kind:"video"|"article"|"guide";
  title:string;
  description?:string;
  youtubeId?:string;
  seriesTitle?:string;
  seriesId?:string;
  sourceGroup?:string;
  topicTags?:readonly string[];
  lifeAreas?:readonly string[];
  contentType?:string|null;
  directions?:readonly string[];
  traditions?:readonly string[];
  audioLanguage?:"en"|"ru"|"es";
  publishedAt?:string;
  curation?:"verified"|"published";
};
export declare const VIDEO_GOALS:readonly string[];
/** Public, coarse video topic only; no user text enters the resulting URL. */
export declare function publicVideoGoalForMessage(message:unknown):
  "stress"|"energy"|"relationships"|"work"|"meaning"|"practices"|null;
export declare function getVideoTopics(video:Partial<DiscoveryVideo>):string[];
export declare function rankDiscoveryVideos<T extends DiscoveryVideo>(
  videos:readonly T[],
  options?:{goal?:string;area?:string;contentType?:string;direction?:string;tradition?:string;language?:string;savedIds?:string[];hiddenIds?:string[];savedOnly?:boolean;sort?:"for-you"|"series"|"newest"},
):T[];
