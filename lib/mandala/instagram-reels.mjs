/**
 * Instagram Reels export contract for the existing, browser-local Video Studio.
 * Choosing a Reel NEVER publishes content, calls Meta/HeyGen or reserves credits.
 */
export const INSTAGRAM_REELS_PROFILE=Object.freeze({
  aspect:"portrait",durationSeconds:30,frameRate:24,
  recommendedWidth:1080,recommendedHeight:1920,
  container:"mp4",videoCodec:"avc",audioCodec:"aac",
  downloadName:"holistic-house-instagram-reel.mp4",
});
export function isInstagramReelSelection(path){
  return Boolean(path?.scope==="business"&&path.workFormat==="insta-reels");
}
export function isInstagramReelActive(selected,aspect,seconds,exportMode){
  return selected===true&&aspect===INSTAGRAM_REELS_PROFILE.aspect&&
    seconds===INSTAGRAM_REELS_PROFILE.durationSeconds&&exportMode==="personal";
}
/** Keep caption TEXT (not merely its baseline) in the safe middle of the portrait. */
export function reelCaptionCenterY(position,height){
  if(!Number.isFinite(height)||height<=0)throw Error("invalid_reel_frame_height");
  return height*(position==="top"?.20:position==="center"?.49:.62);
}
/** Preserve 4 authored hook/context/substance/CTA beats across 4-12 physical shots. */
export function reelCaptionBeatAt(startSeconds,seconds,beats){
  if(!Number.isFinite(startSeconds)||!Number.isFinite(seconds)||seconds<=0||
    !Array.isArray(beats)||beats.length!==4)throw Error("invalid_reel_caption_beats");
  const beat=Math.min(3,Math.max(0,Math.floor(startSeconds/seconds*4)));
  return typeof beats[beat]==="string"?beats[beat]:"";
}
