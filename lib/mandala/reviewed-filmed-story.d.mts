import type {
 CategoryStoryboardPlan, CategoryStoryboardOptions, CategoryVideoAspect
} from "./category-video-storyboard.mjs";
import type {AlignedStoryGuide} from "./storyboard-content-alignment.mjs";
export declare function isReviewedFilmedStoryScene(
 scene:unknown,aspect?:CategoryVideoAspect
):boolean;
export declare function isReviewedFilmedStorySequence(options:{
 shots:readonly {sceneId:string;startSeconds:number;durationSeconds:number}[]|null;
 scenes:readonly unknown[];aspect?:CategoryVideoAspect;
}):boolean;
export declare function planReviewedFilmedStory(
 options?:CategoryStoryboardOptions&{
 goal?:string;phrases?:readonly string[];sceneGuides?:readonly AlignedStoryGuide[];
 excludedVisuals?:readonly string[];pace?:"slow"|"dynamic";
 }
):CategoryStoryboardPlan;
