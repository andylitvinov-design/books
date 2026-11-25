export type GiftVisualGroup="sky"|"forest"|"water"|"flowers"|"mountain"|"winter"|"night";
export type GiftOccasion="birthday"|"love"|"thanks"|"support"|"anniversary"|"custom";
export type GiftAspect="portrait"|"landscape";
export type GiftScene={
  id:string;label:{ru:string;en:string;es:string};
  group:GiftVisualGroup;tags:readonly string[];aspect:GiftAspect;
  video:string;poster:string;durationSeconds:number;driveArchived:boolean;
  clientReady:boolean;rawDownloadAllowed:false;credit:string;licenseUrl:string;
};
export declare const GIFT_VISUAL_GROUPS:readonly {id:GiftVisualGroup;label:{ru:string;en:string;es:string}}[];
export declare const GIFT_APPROVED_SCENES:readonly GiftScene[];
export declare const GIFT_MEDIA_LIBRARY_COUNTS:Readonly<{approvedClientScenes:number;driveArchivedClientScenes:number;driveMasterSceneFiles:number;driveInternalQaVideos:number}>;
export declare function giftVisualGroupForScene(scene:{id:string;tags?:string[]}):GiftVisualGroup;
export declare function defaultGiftVisualGroup(occasion:GiftOccasion):GiftVisualGroup;
export declare function listGiftApprovedScenes(args?:{group?:GiftVisualGroup|"all";occasion?:GiftOccasion;aspect?:GiftAspect}):GiftScene[];
export declare function giftApprovedSceneById(id:string|null|undefined):GiftScene|null;
