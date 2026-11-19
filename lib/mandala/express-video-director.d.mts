export interface ExpressVideoPhotoSlot {
 readonly id:string; readonly sceneNo:number; readonly sourcePage:string;
 readonly matchedWords:readonly string[]; readonly sourceStatus:"editorial_photo_binding";
}
export type ExpressVideoRecipe =
 | {readonly version:string;readonly canRender:false;readonly reason:string;
    readonly clipIds:readonly string[];readonly durationSeconds:0;
    readonly topicId?:string;readonly scenarioId?:string}
 | {readonly version:string;readonly canRender:true;readonly reason:"READY";
    readonly locale:"ru"|"en"|"es";readonly theme:"money"|"energy"|"relationships"|"goals"|"life"|"health";
    readonly topicId:string;readonly scenarioId:string;readonly screenplaySource:string;
    readonly durationSeconds:30|60;readonly aspect:"portrait";
    readonly clipIds:readonly string[];readonly durationSecondsByStage:readonly number[];
    readonly captionTexts:readonly string[];readonly excludedMotifs:readonly string[];
    readonly musicId:string|null;readonly withOriginalAudio:boolean;
    readonly musicBedVolumePercent:number;readonly evidence:string;
    readonly photos:readonly ExpressVideoPhotoSlot[];readonly needsEditorialReview:boolean;
    readonly audioStatus:string;readonly transcriptUsed:boolean };
export declare const EXPRESS_VIDEO_RECIPE_VERSION:string;
export declare function planExpressVideo(input?:{
 locale?:"ru"|"en"|"es";goal?:string;theme?:string;selectedTopicId?:string|null;
 personalization?:unknown;transcript?:{
  text?:string;durationSeconds?:number;
  segments?:readonly {text:string;startSeconds:number;endSeconds:number}[]
 }|null;hasAudio?:boolean;audioDurationSeconds?:number|null;
}):ExpressVideoRecipe;
