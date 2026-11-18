export interface StoryReviewConcept {
 readonly mainMessage?:string;readonly conceptText?:string;
 readonly storyboard?:readonly {readonly title?:string;readonly action?:string;readonly emotion?:string;readonly shotType?:string;readonly continuityKeys?:readonly string[]}[];
 readonly userEditedFields?:readonly string[];readonly storyReviewSignature?:string|null;
 readonly conceptScenes?:readonly {readonly id:string;readonly action:string;readonly narrative?:string}[];
}
export declare function storyReviewSignature(concept?:StoryReviewConcept|null):string|null;
export declare function storyReviewRequired(concept?:StoryReviewConcept|null):boolean;
export declare function conceptSceneAlignment(concept?:StoryReviewConcept|null):{
 readonly aligned:boolean;readonly checked:boolean;readonly reason:string;readonly index?:number;
};
export declare function validEditorialShotActions(actions?:readonly string[]|null):boolean;
