export type PublicVideoLike={
 id:string;kind:string;title:string;
 youtubeId?:string;description?:string;sourceLabel?:string;sourceGroup?:string;
 audioLanguage?:"ru"|"en"|"es";
 topicTags?:string[];lifeAreas?:string[];directions?:string[];traditions?:string[];
 durationVerifiedSeconds?:number;
 contentType?:string|null;curation?:"verified"|"published";
};
export type IndexedVideo<T> = T & {
 youtubeId:string; href:string;kind:"video";
 lifeAreas:string[];contentType:string|null;directions:string[];traditions:string[];
 sourceGroup:string;provenance:string[];
};
export declare function buildPublishedVideoIndex<T extends PublicVideoLike>(items:readonly T[]):IndexedVideo<T>[];
export declare function relatedPublishedVideos<T extends PublicVideoLike>(active:T,items:readonly T[],limit?:number):IndexedVideo<T>[];

export type ReviewedMeditationRow={
 youtube_id:string;title:string;creator:string;source_url:string;
 source_kind:"original"|"external";source_evidence_url?:string|null;
 audio_language:"en"|"ru"|"es";content_type:string;goals?:string[];
 subtopics?:string[];user_situations?:string[];
 duration_verified_seconds?:number|null;duration_basis?:string|null;
 editorial_status:string;embed_status:string;rights_status:string;
 content_checked_at?:string|null;embed_checked_at?:string|null;
 metadata_checked_at?:string|null;claims_risk?:string;
};
export declare function projectApprovedMeditationRows(rows:readonly ReviewedMeditationRow[]):PublicVideoLike[];
