export type PublicVideoLike={
 id:string;kind:string;title:string;
 youtubeId?:string;description?:string;sourceLabel?:string;sourceGroup?:string;
 audioLanguage?:"ru"|"en"|"es";
 topicTags?:string[];lifeAreas?:string[];directions?:string[];traditions?:string[];
 contentType?:string|null;curation?:"verified"|"published";
};
export type IndexedVideo<T> = T & {
 youtubeId:string; href:string;kind:"video";
 lifeAreas:string[];contentType:string|null;directions:string[];traditions:string[];
 sourceGroup:string;provenance:string[];
};
export declare function buildPublishedVideoIndex<T extends PublicVideoLike>(items:readonly T[]):IndexedVideo<T>[];
export declare function relatedPublishedVideos<T extends PublicVideoLike>(active:T,items:readonly T[],limit?:number):IndexedVideo<T>[];
