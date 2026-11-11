import type {
  CategoryStoryboardPlan, CategoryStoryboardOptions, CategoryVideoAspect
} from "./category-video-storyboard.mjs";
export declare function isReviewedFilmedStoryScene(
  scene:unknown,aspect?:CategoryVideoAspect
):boolean;
export declare function isReviewedFilmedStorySequence(options:{
  shots:readonly {sceneId:string;startSeconds:number;durationSeconds:number}[]|null;
  scenes:readonly unknown[];aspect?:CategoryVideoAspect;
}):boolean;
export declare function planReviewedFilmedStory(
  options?:CategoryStoryboardOptions
):CategoryStoryboardPlan;

/** Scene-aware business Story fallback. A photo is never itself an MP4. */
export interface ReviewedStoryConcept {
 readonly categoryId?:string;
 readonly goal?:string;
 readonly sceneOutline?:readonly string[];
 readonly avoidImagery?:readonly string[];
}
export interface ReviewedStoryMix {
 readonly video:number;
 readonly photo:number;
}
export interface ReviewedMixedStoryboardPlan extends CategoryStoryboardPlan {
 readonly videoCandidates:number;
 readonly photoCandidates:number;
 readonly mediaMix:ReviewedStoryMix;
 readonly sourcePolicy?:string;
}
export declare function planReviewedStoryWithPhotos(
 options?:CategoryStoryboardOptions & {concept?:ReviewedStoryConcept|null}
):ReviewedMixedStoryboardPlan;
export declare function isReviewedStoryWithPhotosSequence(options:{
 shots:readonly {sceneId:string;startSeconds:number;durationSeconds:number}[]|null;
 scenes:readonly unknown[];aspect?:CategoryVideoAspect;
}):boolean;
