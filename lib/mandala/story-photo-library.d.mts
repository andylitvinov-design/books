export interface StoryBusinessPhoto {
 readonly id:string;
 readonly media:"licensed_photo";
 readonly visualOrigin:"real_camera_photo";
 readonly src:string;
 readonly upstreamSrc:string;
 readonly sourcePage:string;
 readonly licenseUrl:string;
 readonly creatorLicense:string;
 readonly attribution:string;
 readonly labels:Readonly<Record<"ru"|"en"|"es",string>>;
 readonly tags:readonly string[];
 readonly stage:number;
 readonly durationSeconds:5;
 readonly approval:string;
}
export declare const STORY_PHOTO_LIBRARY_VERSION:string;
export declare const STORY_BUSINESS_PHOTOS:readonly StoryBusinessPhoto[];
export declare const STORY_PHOTO_BY_ID:ReadonlyMap<string,StoryBusinessPhoto>;
export declare function isTrustedStoryPhoto(photo:unknown):photo is StoryBusinessPhoto;
export declare function chooseBusinessStoryPhoto(options?:{
 description?:string;stage?:number;shotIndex?:number;
 usedIds?:readonly string[];avoid?:string|string[];
}):StoryBusinessPhoto|null;
