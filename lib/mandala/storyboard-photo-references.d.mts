export type StoryboardReferencePhoto={
 readonly id:string;
 readonly src:string;
 readonly media:"licensed_photo";
 readonly labels:Readonly<{en:string;ru:string;es:string}>;
 readonly tags:readonly string[];
 readonly attribution:string;
};
export function storyboardPhotoReferences(options?:{
 scenarioId?:string;
 categoryId?:string;
 shotCount?:number;
 avoidImagery?:readonly string[];
 sceneGuides?:readonly {readonly visual?:string;readonly action?:string;
  readonly title?:string;readonly keywords?:readonly string[]}[]|null;
 aspect?:"portrait"|"landscape";
}):readonly (StoryboardReferencePhoto|null)[];
export const STORYBOARD_REFERENCE_STATUS:"editorial_photo_reference_not_action_verified";
export function illustrativeStoryboardPhotoReferences(options?:{
 scenarioId?:string;
 categoryId?:string;
 shotCount?:number;
 aspect?:"portrait"|"landscape";
 avoidImagery?:readonly string[];
 userEditedFields?:readonly string[];
}):readonly StoryboardReferencePhoto[];
export const STORYBOARD_ILLUSTRATION_STATUS:"illustrative_topic_photos_not_action_verified";
