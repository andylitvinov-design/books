export interface StoryPhoto {
 readonly id:string;
 readonly provider:"pexels"|"wikimedia";
 readonly autoUseEligible:boolean;
 readonly media:"licensed_photo";
 readonly visualOrigin:"real_camera_photo";
 readonly src:string;
 readonly upstreamSrc:string;
 readonly sourcePage:string;
 readonly licenseUrl:string;
 readonly licenseId?: "CC0-1.0"|"CC-BY-2.0"|"CC-BY-4.0"|"Public-Domain";
 readonly creatorLicense:string;
 readonly attribution:string;
 readonly labels:Readonly<Record<"ru"|"en"|"es",string>>;
 readonly tags:readonly string[];
 readonly categories:readonly string[];
 readonly stage:number;
 readonly durationSeconds:5;
 readonly approval:string;
}
export type StoryBusinessPhoto=StoryPhoto;
export declare const STORY_PHOTO_LIBRARY_VERSION:string;
export declare const STORY_BUSINESS_PHOTOS:readonly StoryBusinessPhoto[];
export declare const STORY_WIKIMEDIA_PHOTOS:readonly StoryPhoto[];
export declare const STORY_PHOTOS:readonly StoryPhoto[];
export declare const STORY_PHOTO_BY_ID:ReadonlyMap<string,StoryPhoto>;
export declare function isTrustedStoryPhoto(photo:unknown):photo is StoryPhoto;
export declare function chooseBusinessStoryPhoto(options?:{
 description?:string;stage?:number;shotIndex?:number;
 usedIds?:readonly string[];avoid?:string|string[];
}):StoryBusinessPhoto|null;
export declare function chooseConceptStoryPhoto(options?:{
 category?:"business"|"love"|"stress"|"energy"|"body";
 description?:string;stage?:number;usedIds?:readonly string[];avoid?:string|string[];
}):StoryPhoto|null;
