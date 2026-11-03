/** Browser-only clip timing for the existing Holistic House Canvas movie.
 * Times are project seconds, never source-video seconds.
 */
export const TIMELINE_STEP = 0.5;
export const MAX_TEXT_TRACKS = 8;
const finite = (value, fallback=0) => Number.isFinite(value) ? value : fallback;
const snap = (seconds) => Math.round(seconds / TIMELINE_STEP) * TIMELINE_STEP;
const clamp = (n,min,max) => Math.min(max,Math.max(min,n));

/** Always preserve a visible >= .5s interval, even with malformed edits. */
export function normalizeTrackWindow(startSeconds,endSeconds,durationSeconds) {
  const total=clamp(finite(durationSeconds,30),TIMELINE_STEP,60);
  const start=clamp(snap(finite(startSeconds)),0,total-TIMELINE_STEP);
  const end=clamp(snap(finite(endSeconds,total)),start+TIMELINE_STEP,total);
  return {startSeconds:start,endSeconds:end};
}
export function moveTrackWindow(window,nextStart,durationSeconds){
  const previous=normalizeTrackWindow(window.startSeconds,window.endSeconds,durationSeconds);
  const length=previous.endSeconds-previous.startSeconds;
  const total=clamp(finite(durationSeconds,30),TIMELINE_STEP,60);
  const startSeconds=clamp(snap(finite(nextStart)),0,total-length);
  return {startSeconds,endSeconds:startSeconds+length};
}
export function timedTextAt(clips,second){
  if(!Array.isArray(clips)||!Number.isFinite(second))return null;
  const clip=[...clips].reverse().find(item=>
    typeof item.text==="string"&&item.text.trim()&&
    Number.isFinite(item.startSeconds)&&Number.isFinite(item.endSeconds)&&
    second>=item.startSeconds&&second<item.endSeconds);
  if(!clip)return null;
  const edge=Math.min(second-clip.startSeconds,clip.endSeconds-second);
  return {text:clip.text.trim().slice(0,96),alpha:clamp(edge/.22,0,1)};
}
export function trackIsEdited(window,durationSeconds){
  return Boolean(window&&
    (window.startSeconds>0||window.endSeconds<durationSeconds));
}
