/**
 * Selected user affirmations are real, local authored caption clips.
 * They share the Studio's preview/MP4 clock and never leave the browser.
 */
import {normalizeStageCaption} from "./stage-caption-track.mjs";
export const isMontageSetupClip=clip=>typeof clip?.id==="string"&&/^setup-[1-5]$/.test(clip.id);
const tenth=value=>Math.round(value*10)/10;
const safeDuration=seconds=>Number.isFinite(seconds)&&seconds>=5&&seconds<=3600;
export function distributeMontageSetups(lines,seconds){
  if(!Array.isArray(lines)||!safeDuration(seconds))return [];
  const clean=lines.slice(0,5).map(normalizeStageCaption).filter(Boolean);
  return clean.map((text,i)=>{
    const from=tenth(i*seconds/clean.length),to=tenth((i+1)*seconds/clean.length);
    return {id:"setup-"+(i+1),text,startSeconds:from,durationSeconds:tenth(to-from),
      styleId:"classic",motionId:"fade",positionId:"center"};
  });
}
/** A sortable list that changes real caption playback order.
 * Non-setup user captions, text styles and authored motion stay intact.
 */
export function reorderMontageSetups(clips,from,to,seconds,autoTiming=true){
  if(!Array.isArray(clips)||!safeDuration(seconds))return clips;
  const original=clips.filter(isMontageSetupClip);
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||
    from>=original.length||to>=original.length||from===to)return clips;
  const slots=original.map(c=>({startSeconds:c.startSeconds,durationSeconds:c.durationSeconds}));
  const ordered=original.slice();
  ordered.splice(to,0,ordered.splice(from,1)[0]);
  const uniform=distributeMontageSetups(ordered.map(c=>c.text),seconds);
  const timed=ordered.map((clip,i)=>({...clip,
    startSeconds:autoTiming?uniform[i].startSeconds:slots[i].startSeconds,
    durationSeconds:autoTiming?uniform[i].durationSeconds:slots[i].durationSeconds}));
  let n=0;return clips.map(clip=>isMontageSetupClip(clip)?timed[n++]:clip);
}
export function retimeMontageSetups(clips,seconds){
  if(!Array.isArray(clips)||!safeDuration(seconds))return clips;
  const setups=clips.filter(isMontageSetupClip);
  if(!setups.length)return clips;
  const timing=distributeMontageSetups(setups.map(c=>c.text),seconds);
  let n=0;return clips.map(clip=>{
    if(!isMontageSetupClip(clip))return clip;
    const slot=timing[n++];return {...clip,
      startSeconds:slot.startSeconds,durationSeconds:slot.durationSeconds};
  });
}
