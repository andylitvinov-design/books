import type {VideoProjectV3, VideoV3ApprovedAsset} from "./video-project-v3.mjs";

type Locale = VideoProjectV3["locale"];

export function listPresetMotionGuides(locale: Locale): {id: string; label: string; aspect: "portrait"|"landscape"}[];
export function createPresetMotionGuideV3(presetId: string, locale: Locale): string;
export function createPresetMotionProjectV3(presetId: string, locale: Locale): {
  project: VideoProjectV3;
  approvedAssets: VideoV3ApprovedAsset[];
};

export function importCatalogMotionGuideV3(markdown: string, projectId: string, locale: Locale): {
  project: VideoProjectV3;
  approvedAssets: VideoV3ApprovedAsset[];
};

export function searchMotionGuideScenes(query:string,locale:Locale,aspect:VideoProjectV3["aspect"]):
  {id:string;label:string;tags:string[]}[];
export function replaceMotionGuideScene(markdown:string,clipId:string,assetId:string,locale:Locale):string;
export function moveMotionGuideScene(markdown:string,clipId:string,direction:-1|1,locale:Locale):string;

export function searchMotionGuideAudio(query:string,locale:Locale):{id:string;label:string}[];
export function replaceMotionGuideAudio(markdown:string,laneId:string,assetId:string,locale:Locale):string;
