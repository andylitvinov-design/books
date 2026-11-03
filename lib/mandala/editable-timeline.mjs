/**
 * User-authored video/text/audio track timing for the existing local Canvas renderer.
 * One deterministic clock; no upload, provider, payment, or second export path.
 */
import { normalizeStageCaption } from "./stage-caption-track.mjs";

const SNAP=10;
const roundSeconds=value=>Math.round(value*SNAP)/SNAP;

export function clampTrackSecond(value,maxSeconds){
  const n=Number(value);
  const max=Number(maxSeconds);
  if(!Number.isFinite(n)||!Number.isFinite(max)||max<0)return 0;
  return roundSeconds(Math.max(0,Math.min(max,n)));
}

/** Normalize user-edited captions, preserving ordering and IDs without inventing any content. */
export function normalizeTimelineClips(clips,seconds){
  if(!Array.isArray(clips)||!Number.isFinite(seconds)||seconds<=0)return [];
  return clips.slice(0,16).flatMap((entry,index)=>{
    const text=normalizeStageCaption(entry?.text);
    if(!text)return [];
    const startSeconds=clampTrackSecond(entry.startSeconds,Math.max(0,seconds-.1));
    const proposed=Number(entry.durationSeconds);
    const durationSeconds=Math.max(.1,clampTrackSecond(
      Number.isFinite(proposed)?proposed:3,seconds-startSeconds
    ));
    return [{id:String(entry.id??"text-"+index).slice(0,64),text,startSeconds,durationSeconds}];
  });
}

/** Captions are independent of the current shot; moving a caption does not move its film. */
export function timedCaptionAt(clips,seconds){
  if(!Number.isFinite(seconds)||seconds<0||!Array.isArray(clips))return null;
  const clip=[...clips].reverse().find(item=>item.text&&
    seconds>=item.startSeconds&&seconds<item.startSeconds+item.durationSeconds);
  if(!clip)return null;
  const localTime=seconds-clip.startSeconds;
  const fadeIn=Math.min(1,localTime/.2);
  const fadeOut=Math.min(1,Math.max(0,clip.durationSeconds-localTime)/.3);
  return {text:normalizeStageCaption(clip.text),alpha:Math.max(0,Math.min(fadeIn,fadeOut)),
    localTime,durationSeconds:clip.durationSeconds};
}

export function moveTimelineCaption(clips,id,targetSeconds,seconds){
  const current=normalizeTimelineClips(clips,seconds);
  return normalizeTimelineClips(current.map(clip=>clip.id===id?{
    ...clip,startSeconds:clampTrackSecond(targetSeconds,Math.max(0,seconds-clip.durationSeconds))
  }:clip),seconds);
}
