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
