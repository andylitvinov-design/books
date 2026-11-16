export type AudioConceptKeyword={id:string;seenInSelectedClips:boolean};
export type AudioConceptShot={index:number;sceneId:string;startSeconds:number;
 endSeconds:number;title:string;spokenText:string;visualSignals:string[];needsReview:boolean};
export type AudioVideoConcept={
 version:string;source:string;locale:"ru"|"en"|"es";
 goal:{text:string;origin:"quoted_source_not_generated"};
 purpose:string;category:string;subcategory:string|null;topic:string|null;
 topicId:string|null;confidence:string;
 style:{id:string|null;label:string|null;origin:string;sourceVerified:boolean};
 symbol:{id:string;label:string;meaning:string;sourceVerified:boolean}|null;
 pace:"gentle"|"steady"|"dynamic";aspect:"9:16";durationSeconds:number;
 keywords:AudioConceptKeyword[];stages:AudioConceptShot[];
 previewOnly:boolean;requiresReview:boolean;canExport:boolean;note:string;
};
export declare const AUDIO_CONCEPT_DIRECTOR_VERSION:string;
export declare function deriveAudioVideoConcept(options?:{
 transcript?:{text:string;durationSeconds:number;segments:readonly object[]};
 plan?:{canExport:boolean;shots:readonly object[];durationSeconds:number;
 excludedMotifs?:readonly string[]};locale?:"ru"|"en"|"es";
}):AudioVideoConcept|null;
