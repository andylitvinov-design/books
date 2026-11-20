import type {VideoProjectV3, VideoV3ApprovedAsset} from "./video-project-v3.mjs";

type Locale = VideoProjectV3["locale"];

export function listPresetMotionGuides(locale: Locale): {id: string; label: string; aspect: "portrait"|"landscape"}[];
export function createPresetMotionGuideV3(presetId: string, locale: Locale): string;
export function createPresetMotionProjectV3(presetId: string, locale: Locale): {
  project: VideoProjectV3;
  approvedAssets: VideoV3ApprovedAsset[];
};
