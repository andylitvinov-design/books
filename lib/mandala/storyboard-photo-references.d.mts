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
}):readonly (StoryboardReferencePhoto|null)[];
export const STORYBOARD_REFERENCE_STATUS:"editorial_photo_reference_not_action_verified";
