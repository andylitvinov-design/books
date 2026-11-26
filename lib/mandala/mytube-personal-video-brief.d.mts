/** Local-only user brief for the current canonical MyTube hierarchy.
 * No provider calls, persistence, diagnosis or unverified footage promised.
 */
export interface PersonalVideoBriefStage {
 readonly index:number;
 readonly role:"orientation"|"support"|"development"|"integration";
 readonly title:string;
 readonly visualTags:readonly string[];
 readonly sceneQuery:string;
 readonly emotionalDirection:string;
}
export interface PersonalVideoBrief {
 readonly version:"hh-personal-video-brief-v1";
 readonly clientWish:string;
 readonly categoryId:string|null;
 readonly subcategoryId:string|null;
 readonly topicId:string|null;
 readonly hierarchy:readonly string[];
 readonly fromEmotion:string;
 readonly toEmotion:string;
 readonly stages:readonly PersonalVideoBriefStage[];
 readonly visualTags:readonly string[];
 readonly prompt:string;
 readonly localOnly:true;
 readonly requiresLicensedMedia:true;
}
export declare function buildPersonalVideoBrief(options?:{
 clientWish?:string;categoryId?:string;subcategoryId?:string;topicId?:string;
 scenarioLabel?:string;plotLabel?:string;meaningLabel?:string;
 motifLabel?:string;locale?:"ru"|"en"|"es";excludedMotifs?:readonly string[];
}):PersonalVideoBrief;
