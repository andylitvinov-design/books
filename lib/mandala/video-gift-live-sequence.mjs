/**
 * One consented 5s HeyGen intro + four reviewed same-origin 5s film masters.
 * Google Drive is a master archive, never a browser media endpoint.
 * This pure planner does not call a provider or create a paid job.
 */
import {giftApprovedSceneById,listGiftApprovedScenes} from "./video-gift-clip-catalog.mjs";

export const GIFT_LIVE_SEGMENT_SECONDS=5;
export const GIFT_LIVE_STOCK_COUNT=4;
export const GIFT_LIVE_TOTAL_SECONDS=25;

export function giftLiveSegmentAt(second) {
  if (!Number.isFinite(second) || second < 0) throw new TypeError("gift_live_time_invalid");
  return Math.min(4, Math.floor(Math.min(24.999,second)/5));
}

export function planGiftLiveSequence({sceneId=null,group="all",occasion="custom",aspect="portrait"}={}) {
  if (sceneId && sceneId!=="none" && !giftApprovedSceneById(sceneId))
    throw new TypeError("gift_live_scene_not_approved");
  const featured=sceneId && sceneId!=="none" ? giftApprovedSceneById(sceneId) : null;
  const preferred=listGiftApprovedScenes({group,occasion,aspect});
  const remaining=listGiftApprovedScenes({group:"all",occasion,aspect});
  const seen=new Set(), chosen=[];
  for (const scene of [featured,...preferred,...remaining]) {
    if (!scene || seen.has(scene.id) || !scene.clientReady) continue;
    seen.add(scene.id); chosen.push(scene);
    if (chosen.length===GIFT_LIVE_STOCK_COUNT) break;
  }
  if (chosen.length!==GIFT_LIVE_STOCK_COUNT) throw new Error("gift_live_stock_insufficient");
  return Object.freeze(chosen.map((scene,index)=>Object.freeze({
    ...scene,from:(index+1)*GIFT_LIVE_SEGMENT_SECONDS,
    to:(index+2)*GIFT_LIVE_SEGMENT_SECONDS
  })));
}
