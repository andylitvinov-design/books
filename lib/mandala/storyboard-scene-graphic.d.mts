export interface StoryboardSceneGraphicInput{
 readonly action?:string;readonly visualSubject?:string;readonly keywords?:readonly string[];
}
export interface StoryboardSceneGraphic{
 readonly sourceAction:string;readonly cueIds:readonly string[];
 readonly hasLiteralObjectEvidence:boolean;
 readonly visualStatus:"editorial_scene_sketch_unverified";
}
export declare function describeStoryboardSceneGraphic(input?:StoryboardSceneGraphicInput):StoryboardSceneGraphic;
