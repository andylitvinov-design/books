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

/** Optional magnetic seek used by all editor tracks, never by film rendering. */
export function snapTimelineSecond(target,boundaries,seconds,tolerance=.35){
  const at=clampTrackSecond(target,seconds);
  if(!Array.isArray(boundaries)||!Number.isFinite(tolerance)||tolerance<=0)return at;
  let best=at,closest=tolerance+1e-8;
  for(const mark of boundaries){
    if(!Number.isFinite(mark)||mark<0||mark>seconds)continue;
    const distance=Math.abs(mark-at);
    if(distance<=tolerance&&distance<closest){
      closest=distance;best=mark;
    }
  }
  return clampTrackSecond(best,seconds);
}
const editorClipId=value=>typeof value==="string"&&
  /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value);
/** Split a user's own caption, retaining verbatim authored text on both sides. */
export function splitTimelineCaption(clips,id,atSeconds,seconds,newId){
  const current=normalizeTimelineClips(clips,seconds);
  if(current.length>=16||!editorClipId(newId)||
     current.some(clip=>clip.id===newId))return current;
  const index=current.findIndex(clip=>clip.id===id);
  if(index<0)return current;
  const clip=current[index],end=clip.startSeconds+clip.durationSeconds;
  const at=clampTrackSecond(atSeconds,seconds);
  if(at-clip.startSeconds<.2-1e-8||end-at<.2-1e-8)return current;
  const left={...clip,durationSeconds:roundSeconds(at-clip.startSeconds)};
  const right={...clip,id:newId,startSeconds:at,durationSeconds:roundSeconds(end-at)};
  return normalizeTimelineClips([
    ...current.slice(0,index),left,right,...current.slice(index+1)
  ],seconds);
}
/** Copy an authored caption half a second later without altering the original. */
export function duplicateTimelineCaption(clips,id,newId,seconds){
  const current=normalizeTimelineClips(clips,seconds);
  if(current.length>=16||!editorClipId(newId)||
     current.some(clip=>clip.id===newId))return current;
  const index=current.findIndex(clip=>clip.id===id);
  if(index<0)return current;
  const clip=current[index],latest=Math.max(0,seconds-clip.durationSeconds);
  const duplicate={...clip,id:newId,startSeconds:clampTrackSecond(
    Math.min(latest,clip.startSeconds+.5),latest)};
  return normalizeTimelineClips([
    ...current.slice(0,index+1),duplicate,...current.slice(index+1)
  ],seconds);
}
