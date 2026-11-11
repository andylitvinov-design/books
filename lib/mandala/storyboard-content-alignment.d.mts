export interface AlignedStoryGuide {
 readonly index:number;readonly stage:number;readonly title:string;
 readonly visual:string;readonly keywords:readonly string[];
 readonly sourcePhrase:string|null;
}
export interface AlignedStoryGuides {
 readonly professional:boolean;readonly pace:"slow"|"dynamic";
 readonly scenes:readonly AlignedStoryGuide[];
}
export declare function isProfessionalVideoIntent(args?:{goal?:string;phrases?:readonly string[]}):boolean;
export declare function buildAlignedStorySceneGuides(args?:{
 locale?:string;goal?:string;phrases?:readonly string[];
 concept?:{sceneOutline?:readonly string[]}|null;count?:number;
 pace?:"slow"|"dynamic";
}):AlignedStoryGuides;
export declare function matchesFilmedStorySubject(scene:unknown,args?:{
 professional?:boolean;excludedVisuals?:readonly string[];
}):boolean;
