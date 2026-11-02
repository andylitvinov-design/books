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
  audioLanguage?:"en"|"ru"|"es";
  publishedAt?:string;
  curation?:"verified"|"published";
};
export declare const VIDEO_GOALS:readonly string[];
export declare function getVideoTopics(video:Partial<DiscoveryVideo>):string[];
export declare function rankDiscoveryVideos<T extends DiscoveryVideo>(
  videos:readonly T[],
  options?:{goal?:string;language?:string;savedIds?:string[];hiddenIds?:string[];savedOnly?:boolean;sort?:"for-you"|"series"|"newest"},
):T[];
