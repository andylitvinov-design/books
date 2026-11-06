/** Strong TypeScript boundary for the approved JS-only storyboard.
 * No media eligibility, licensing or published state is inferred by types.
 */
export declare const CATEGORY_STORYBOARD_VERSION:'hh-category-storyboard-v1';
export type CategoryVideoAspect='landscape'|'portrait'|'square';
export type CategoryVideoLocale='ru'|'en'|'es';
export interface VerifiedCategorySource {
 readonly id:string;
 readonly video:string;
 readonly width:number;
 readonly height:number;
 readonly durationSeconds:number;
 readonly aspectPhysicallyVerified:true;
 // Trusted identity/geometry above; editorial metadata below is optional.
 // This preserves source-provenance fields after the runtime manifest lookup
 // WITHOUT claiming that a textual tag is visually verified in the frame.
 readonly tags?:readonly string[];
 readonly motifs?:readonly string[];
 readonly categories?:readonly string[];
 readonly label?:Readonly<{en?:string;ru?:string;es?:string}>;
 readonly description?:Readonly<{en?:string;ru?:string;es?:string}>;
 readonly originMasterKeys?:readonly string[];
 readonly perceptualGroupId?:string|null;
}
export interface CategoryStoryboardStage {
 readonly stage:number;
 readonly name:string;
 readonly purpose:string;
 readonly requiredTags:string[];
 readonly styleId:string|null;
}
export interface CategoryStoryboardShot {
 readonly index:number;
 readonly stage:number;
 readonly sceneId:string;
 readonly sourceMasterKey:string;
 readonly sourcePath:string;
 readonly startMs:number;
 readonly sourceInMs:number;
 readonly durationMs:number;
 readonly sourceDurationMs:number;
 readonly matchedTags:readonly string[];
 readonly symbolicFallback:boolean;
 readonly loopRequired:false;
 readonly depictedEventVerified:false;
}
export interface CategoryStoryboardPlan {
 readonly ok:boolean;
 readonly status:string;
 readonly stages:readonly CategoryStoryboardStage[];
 readonly shots:readonly CategoryStoryboardShot[];
 readonly canExport:boolean;
 readonly requiredUniqueMasters?:number;
 readonly availableUniqueMasters?:number;
 readonly missingUniqueMasters?:number;
}
export interface CategoryStoryboardOptions {
 categoryId?:string|null;
 locale?:CategoryVideoLocale;
 aspect?:CategoryVideoAspect;
 durationSeconds?:number;
 styleId?:string|null;
 excludedMotifs?:readonly string[];
 scenes?:readonly unknown[];
}
export declare function planMyTubeCategory(options?:CategoryStoryboardOptions):CategoryStoryboardPlan;
export declare function verifiedCategorySource(scene:unknown):VerifiedCategorySource|null;
export declare function verifiedSceneAspect(
 scene:VerifiedCategorySource|null|undefined,aspect:CategoryVideoAspect):boolean;
export declare function canonicalSourceMasterKey(scene:unknown):string|null;
